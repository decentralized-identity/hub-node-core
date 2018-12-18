import AuthorizationController, { AuthorizationOperation } from '../../lib/controllers/AuthorizationController';
import TestCommit from '../mocks/TestCommit';
import PermissionGrant, { OWNER_PERMISSION, PERMISSION_GRANT_CONTEXT, PERMISSION_GRANT_TYPE } from '../../lib/models/PermissionGrant';
import ObjectContainer from '../../lib/interfaces/ObjectContainer';
import Commit, { Operation } from '../../lib/models/Commit';
import * as store from '../../lib/interfaces/Store';
import BaseRequest from '../../lib/models/BaseRequest';
import HubError, { ErrorCode } from '../../lib/models/HubError';
import TestContext from '../mocks/TestContext';
import CommitQueryRequest from '../../lib/models/CommitQueryRequest';
import SignedCommit from '../../lib/models/SignedCommit';
import TestRequest from '../mocks/TestRequest';
import TestUtilities from '../TestUtilities';

describe('AuthorizationController', () => {
  let store: jasmine.Spy;
  let commitsStore: jasmine.Spy;
  let auth: AuthorizationController;

  beforeEach(() => {
    const context = new TestContext();
    store = spyOn(context.store, 'queryObjects');
    commitsStore = spyOn(context.store, 'queryCommits');
    auth = new AuthorizationController(context);
  });
  
  describe('getPermissionGrantsForRequest', () => {
    it('should allow did owner without rules', async () => {
      const did = `did:example:${TestUtilities.randomString()}`;
      const request = TestRequest.createWriteRequest({
        iss: did,
        sub: did,
      });
      store.and.returnValue({results: [], pagination: {skip_token: null}});
      const grants = await auth.getPermissionGrantsForRequest(request);
      expect(grants.length > 0).toBeTruthy();
      expect(grants[0]).toEqual(OWNER_PERMISSION);
      
    });
    
    it('should reject non-owner without rules', async () => {
      const owner = `did:example:${TestUtilities.randomString()}`;
      const sender = `${owner}-not`;
      const request = TestRequest.createWriteRequest({
        iss: sender,
        sub: owner,
      });
      store.and.returnValue({results: [], pagination: {skip_token: null}});
      try {
        await auth.getPermissionGrantsForRequest(request);
      } catch (err) {
        if (!(err instanceof HubError)) {
          fail(err.message);
        }
        expect(err.errorCode).toEqual(ErrorCode.PermissionsRequired);
      }
      expect(store).toHaveBeenCalled();
    });

    function returnPermissions(grants: PermissionGrant[]) {
      const asCommits: Commit[] = [];
      grants.forEach((grant) => {
        asCommits.push(TestCommit.create({
          interface: 'Permissions',
          context: PERMISSION_GRANT_CONTEXT,
          type: PERMISSION_GRANT_TYPE,
          operation: Operation.Create,
          commit_strategy: 'basic',
          sub: 'did:example:alice.id',
          kid: 'did:example:alice.id#key-1',
        }, grant));
      });
      returnPermissionObject(asCommits);
    }
    
    function returnPermissionObject(commits: Commit[]) {
      const asObjects: ObjectContainer[] = [];
      commits.forEach((commit) => {
        asObjects.push({
          interface: 'Permissions',
          context: PERMISSION_GRANT_CONTEXT,
          type: PERMISSION_GRANT_TYPE,
          id: commit.getHeaders().rev,
          created_by: 'did:example:alice.id', 
          created_at: new Date(Date.now()).toISOString(),
          sub: 'did:example:alice.id',
          commit_strategy: 'basic',
        });
      });
      store.and.returnValue({
        results: asObjects,
        pagination: {
          skip_token: null
        }
      });
      returnPermissionCommits(commits);
    }

    function returnPermissionCommits(commits: Commit[]) {
      const asCommits: {[id: string]: Commit} = {};
      commits.forEach((commit) => {
        asCommits[commit.getHeaders().rev] = commit;
      })
      commitsStore.and.callFake((query: store.CommitQueryRequest): Promise<store.CommitQueryResponse> => {
        return new Promise((resolve, reject) => {
          if (!query.filters) {
            fail('must query for permission grant object');
            reject();
            return;
          }
          query.filters.forEach((filter) => {
            if (filter.field === 'object_id') {
              if (typeof filter.value === 'string') {
                resolve({
                  results: [
                    asCommits[filter.value]
                  ],
                  pagination: {
                    skip_token: null,
                  }});
                  return;
              }
              resolve({
                results: [
                  asCommits[filter.value[0]]
                ],
                pagination: {
                  skip_token: null,
                }});
                return;
              }
              fail('could not find an object_id filter');
              reject();
              return;
            });
          });
        });
      }
      
      async function checkPermissionFor(operation: Operation, allowString: string) {
        const owner = 'did:example:alice.id';
        const sender = `${owner}-not`;
        const type = TestUtilities.randomString();
        const object_id = (operation !== Operation.Create ? type : undefined);
        const request = TestRequest.createWriteRequest({
          iss: sender,
          sub: owner,
          interface: 'Test',
          context: 'example.com',
          type,
          operation,
          object_id,
          kid: `${sender}#key-1`
        });
        const permission = {
          owner,
          grantee: sender,
          allow: allowString,
          context: 'example.com',
          type,
        }
        returnPermissions([permission]);
        const returnedPermissions = await auth.getPermissionGrantsForRequest(request)
        expect(returnedPermissions.length > 0).toBeTruthy();
        expect(returnedPermissions[0]).toEqual(permission);
      }
      
      it('should accept for create requests', async () => {
        await checkPermissionFor(Operation.Create, 'C----');
      });

      it('should accept for read requests', async () => {
        const owner = 'did:example:alice.id';
        const sender = `${owner}-not`;
        const type = TestUtilities.randomString();
        const request = TestRequest.createObjectQueryRequest({
          iss: sender,
          sub: owner,
          interface: 'Collections',
          context: 'example.com',
          type,
        });
        const permission = {
          owner,
          grantee: sender,
          allow: '-R---',
          context: 'example.com',
          type,
        }
        returnPermissions([permission]);
        const returnedPermissions = await auth.getPermissionGrantsForRequest(request)
        expect(returnedPermissions.length > 0).toBeTruthy();
        expect(returnedPermissions[0]).toEqual(permission);
      });

      it('should accept for update requests', async () => {
        await checkPermissionFor(Operation.Update, '--U--');
      });

      it('should accept for delete requests', async () => {
        await checkPermissionFor(Operation.Delete, '---D-');
      });

      it('should reject for unknown request types', async () => {
        const owner = 'did:example:alice.id';
        const sender = `${owner}-not`;
        const type = TestUtilities.randomString();
        const request = new TestRequest({
          iss: sender,
          aud: 'did:example:hub.id',
          sub: owner,
          '@context': BaseRequest.context,
          '@type': type,
        });
        try {
          await auth.getPermissionGrantsForRequest(request);
          fail('did not throw');
        } catch (err) {
          if (!(err instanceof HubError)) {
            fail(err.message);
          }
          expect(err.errorCode).toEqual(ErrorCode.BadRequest);
          expect(err.property).toEqual('@type');
        }
      });

      it('should throw for unknown commit operations', async() => {
        const owner = 'did:example:alice.id';
        const sender = `${owner}-not`;
        const type = TestUtilities.randomString();
        try {
          const request = TestRequest.createWriteRequest({
            iss: sender,
            sub: owner,
            interface: 'Test',
            context: 'example.com',
            type,
            operation: 'unknown',
            kid: `${sender}#key-1`
          });
          await auth.getPermissionGrantsForRequest(request);
          fail('did not throw');
        } catch (err) {
          if (!(err instanceof HubError)) {
            fail(err.message);
          }
          expect(err.errorCode).toEqual(ErrorCode.BadRequest);
          expect(err.property).toEqual('commit.protected.operation');
        }
      });

      it('should ignore permissions not using the \'basic\' commit_strategy', async () => {
        const owner = 'did:example:alice.id';
        const sender = `${owner}-not`;
        const grantObject = {
          interface: 'Permissions',
          context: PERMISSION_GRANT_CONTEXT,
          type: PERMISSION_GRANT_TYPE,
          id: 'complex-permission',
          created_by: owner, 
          created_at: new Date(Date.now()).toISOString(),
          sub: owner,
          commit_strategy: 'not-basic-totally-complex-commit-strategy',
        }
        store.and.returnValue({
          results: [grantObject],
          pagination: {
            skip_token: null
          }
        });
        const request = TestRequest.createWriteRequest({
          iss: sender,
          sub: owner,
          interface: 'Test',
          context: 'example.com',
          type: 'someSortOfType',
          kid: `${sender}#key-1`
        });
        try {
          await auth.getPermissionGrantsForRequest(request);
        } catch (err) {
          if (!(err instanceof HubError)) {
            fail(err.message);
          }
          expect(err.errorCode).toEqual(ErrorCode.PermissionsRequired);
        }
      });

      it('should ignore permission objects with no valid commits', async() => {
        const owner = 'did:example:alice.id';
        const sender = `${owner}-not`;
        const type = TestUtilities.randomString();
        const permissionCommit = TestCommit.create({
          interface: 'Permissions',
          context: PERMISSION_GRANT_CONTEXT,
          type: PERMISSION_GRANT_TYPE,
          operation: Operation.Create,
          commit_strategy: 'complex',
          sub: owner,
          kid: `${owner}#key-1`,
        }, {
          owner,
          grantee: sender,
          allow: '--U--',
          context: 'example.com',
          type,
        });
        const grantObject = {
          interface: 'Permissions',
          context: PERMISSION_GRANT_CONTEXT,
          type: PERMISSION_GRANT_TYPE,
          id: permissionCommit.getHeaders().rev,
          created_by: owner, 
          created_at: new Date(Date.now()).toISOString(),
          sub: owner,
          commit_strategy: 'basic',
        }
        store.and.returnValue({
          results: [grantObject],
          pagination: {
            skip_token: null
          }
        });
        returnPermissionCommits([permissionCommit]);

        const request = TestRequest.createWriteRequest({
          iss: sender,
          sub: owner,
          interface: 'Test',
          context: 'example.com',
          type,
          kid: `${sender}#key-1`
        });
        try {
          await auth.getPermissionGrantsForRequest(request);
        } catch (err) {
          if (!(err instanceof HubError)) {
            fail(err.message);
          }
          expect(err.errorCode).toEqual(ErrorCode.PermissionsRequired);
        }
      });

      it('should ignore CREATE permissions in a created_by conflict', async() => {
        const owner = 'did:example:alice.id';
        const sender = `${owner}-not`;
        const type = TestUtilities.randomString();
        const grant: PermissionGrant = {
          owner,
          grantee: sender,
          context: 'example.com',
          type,
          allow: 'C----',
          created_by: owner
        }
        returnPermissions([grant]);
        const request = TestRequest.createWriteRequest({
          iss: sender,
          sub: owner,
          interface: 'Test',
          context: 'example.com',
          type,
          kid: `${sender}#key-1`
        });
        try {
          await auth.getPermissionGrantsForRequest(request);
          fail('should have thrown');
        } catch (err) {
          if (!(err instanceof HubError)) {
            fail(err.message);
          }
          expect(err.errorCode).toEqual(ErrorCode.PermissionsRequired);
        }
      });

      it('should ignore objectQueryRequests without contexts and types (autofail non-owners)', async () => {
        const request = TestRequest.createObjectQueryRequest({
          sub: 'did:example:bob.id',
          override_no_context: true,
          override_no_type: true,
        });
        const spy = spyOn(auth, 'getPermissionGrants' as any).and.callFake((operation: AuthorizationOperation,
          owner: string,
          requester: string,
          contextTypePairs: [string, string][]) => {
            expect(operation).toEqual(AuthorizationOperation.Read);
            expect(owner).toEqual(request.sub);
            expect(requester).toEqual(request.iss);
            expect(contextTypePairs.length).toEqual(0);
        });
        await auth.getPermissionGrantsForRequest(request);
        expect(spy).toHaveBeenCalled();
      });

      it('should reject getPermissionGrantsForRequest for CommitQueryrequests', async () => {
        const request = new CommitQueryRequest({
          iss: 'did:example:alice.id',
          aud: 'did:example:hub.id',
          sub: 'did:example:bob.id',
          '@context': BaseRequest.context,
          '@type': 'CommitQueryRequest',
        });
        try {
          await auth.getPermissionGrantsForRequest(request)
          fail('should throw')
        } catch (err) {
          if (!(err instanceof HubError)) {
            fail(err.message)
          }
          expect(err.errorCode).toEqual(ErrorCode.ServerError);
        }
      });
  });

  describe('pruneResults', () => {
    function createObjects(context: string, type: string): ObjectContainer[] {
      const count = Math.round(Math.random() * 10) + 1;
      const objects: ObjectContainer[] = [];
      for (let i = 0; i < count; i++) {
        objects.push({
          interface: 'Collections',
          context,
          type,
          id: TestUtilities.randomString(),
          sub: 'did:example:alice.id',
          created_by: 'did:example:alice.id',
          created_at: new Date(Date.now()).toISOString(),
          commit_strategy: 'basic'
        });
      }
      return objects;
    }

    it('should allow if there exists any permission grant that allows reading', async () => {
      const owner = 'did:example:alice.id';
      const sender = `${owner}-not`;
      const context = 'example.com';
      const type = 'testType';
      const objects = createObjects(context, type);
      const grant: PermissionGrant = {
        owner,
        grantee: sender,
        allow: '-R---',
        context,
        type
      }
      const results = await AuthorizationController.pruneResults(objects, [grant]);
      expect(results.length).toEqual(objects.length);
      expect(results).toEqual(objects);
    });

    it('should fail if the query is unrestricted but the permissions are restricted', async () => {
      const owner = 'did:example:alice.id';
      const sender = `${owner}-not`;
      const context = 'example.com';
      const type = 'testType';
      const objects = createObjects(context, type);
      const grant: PermissionGrant = {
        owner,
        grantee: sender,
        allow: '-R---',
        context,
        type,
        created_by: owner
      }
      try {
        await AuthorizationController.pruneResults(objects, [grant]);
        fail('did not throw');
      } catch (err) {
        if (!(err instanceof HubError)) {
          fail(err.message);
        }
        expect(err.errorCode).toEqual(ErrorCode.PermissionsRequired);
      }
    });
  });

  describe('getPermissionGrantsForCommitQuery', () => {
    it('should allow the owner', async () => {
      const request = new CommitQueryRequest({
        iss: 'did:example:alice.id',
        aud: 'did:example:hub.id',
        sub: 'did:example:alice.id',
        '@context': BaseRequest.context,
        '@type': 'CommitQueryRequest',
      });
      const commit = TestCommit.create();
      const grant = await auth.getPermissionGrantsForCommitQuery(request, [commit]);
      expect(grant.length).toEqual(1);
    });

    it('should create allow a commit read with the corresponding grant', async () => {
      const commit = TestCommit.create({
        commit_strategy: 'basic',
        context: 'PERMISSION_GRANT_CONTEXT',
        type: PERMISSION_GRANT_TYPE,
      }, {
        owner: 'did:example:alice.id',
        grantee: 'did:example:bob.id',
        allow: '-R---',
        context: 'example.com',
        type: 'test',
      } as PermissionGrant);
      const dataCommit = TestCommit.create({
        context: 'example.com',
        type: 'test',
        sub: 'did:example:alice.id',
      });
      store.and.callFake((request: store.ObjectQueryRequest) => {
        if (!request.filters) {
          return;
        }
        const results: ObjectContainer[] = []
        request.filters.forEach((filter) => {
          if (filter.field === 'object_id') {
            results.push({
              interface: 'Collections',
              context: 'example.com',
              type: 'test',
              id: dataCommit.getHeaders().rev,
              created_by: 'did:example:alice.id',
              created_at: new Date(Date.now()).toISOString(),
              sub: 'did:example:alice.id',
              commit_strategy: 'basic',
            })
          }
          if (filter.field === 'interface' && filter.value === 'Permissions') {
            results.push({
              interface: 'Permissions',
              context: PERMISSION_GRANT_CONTEXT,
              type: PERMISSION_GRANT_TYPE,
              id: commit.getHeaders().rev,
              created_by: 'did:example:alice.id',
              created_at: new Date(Date.now()).toISOString(),
              sub: 'did:example:alice.id',
              commit_strategy: 'basic',
            });
          }
        });
        return {
          results,
          pagination: {
            skip_token: null,
          },
        }
      });
      commitsStore.and.returnValue({
        results: [
          new SignedCommit({
            protected: commit.getProtectedString(),
            payload: commit.getPayloadString(),
            signature: 'foo',
          }),
        ],
        pagination: {
          skip_token: null,
        },
      });

      const commitRequest = new CommitQueryRequest({
        iss: 'did:example:bob.id',
        aud: 'did:example:hub.id',
        sub: 'did:example:alice.id',
        '@context': BaseRequest.context,
        '@type': 'CommitQueryRequest',
        query: {
          rev: [commit.getHeaders().rev],
        },
      });

      const grants = await auth.getPermissionGrantsForCommitQuery(commitRequest, [dataCommit]);
      expect(grants.length).toEqual(1);
    });
  });

  describe('doesGrantPermit', () => {
    function doesGrantPermit(grant: PermissionGrant, operation: AuthorizationOperation): boolean {
      return AuthorizationController['doesGrantPermit'](grant, operation);
    }

    const crudMap: {[operation: string]: string} = {
      'create': 'C---',
      'read': '-R--',
      'update': '--U-',
      'delete': '---D',
    };

    const allOperations = [AuthorizationOperation.Create, AuthorizationOperation.Delete, AuthorizationOperation.Read, AuthorizationOperation.Update];

    allOperations.forEach((operation) => {
      const grant: PermissionGrant = {
        owner: 'did:example:alice.id',
        grantee: 'did:example:bob.id',
        allow: crudMap[operation],
        context: 'foo',
        type: 'bar'
      };
      it(`should grant ${operation} for ${crudMap[operation]} in CRUD permissions`, () => {
        expect(doesGrantPermit(grant, operation)).toBeTruthy();
      });

      allOperations.forEach((otherOperation) => {
        if (otherOperation !== operation) {
          it(`should deny ${otherOperation} for ${crudMap[operation]} in CRUD permissions`, () => {
            expect(doesGrantPermit(grant, otherOperation)).toBeFalsy();
          });
        }
      });
    });

    it('should deny any operation it is unaware of', () => {
      const grant: PermissionGrant = {
        owner: 'did:example:alice.id',
        grantee: 'did:example:bob.id',
        allow: 'CRUD',
        context: 'foo',
        type: 'bar'
      };
      expect(doesGrantPermit(grant, 'someThing' as AuthorizationOperation)).toBeFalsy();
    })
  });
});
