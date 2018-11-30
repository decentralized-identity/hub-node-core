import TestStore from '../mocks/TestStore';
import AuthorizationController from '../../lib/controllers/AuthorizationController';
import WriteRequest from '../../lib/models/WriteRequest';
import TestCommit from '../mocks/TestCommit';
import { Context } from '../models/BaseRequest.spec';
import PermissionGrant, { OWNER_PERMISSION, PERMISSION_GRANT_CONTEXT, PERMISSION_GRANT_TYPE } from '../../lib/models/PermissionGrant';
import ObjectContainer from '../../lib/interfaces/ObjectContainer';
import Commit, { Operation } from '../../lib/models/Commit';
import base64url from 'base64url';
import ObjectQueryRequest from '../../lib/models/ObjectQueryRequest';
import { CommitQueryRequest, CommitQueryResponse } from '../../lib/interfaces/Store';

describe('AuthorizationController', () => {
  let store: jasmine.Spy;
  let commitsStore: jasmine.Spy;
  let auth: AuthorizationController;
  
  beforeEach(() => {
    const testStore = new TestStore();
    store = spyOn(testStore, 'queryObjects');
    commitsStore = spyOn(testStore, 'queryCommits');
    auth = new AuthorizationController(testStore);
  });
  
  describe('authorize', () => {
    it('should allow did owner without rules', async () => {
      const did = `did:test:${Math.round(Math.random() * Number.MAX_SAFE_INTEGER).toString(16)}`;
      const commit = TestCommit.create();
      const request = new WriteRequest({
        iss: did,
        aud: 'did:example:hub',
        sub: did,
        '@context': Context,
        '@type': 'WriteRequest',
        commit: {
          protected: commit.getProtectedString(),
          payload: 'foo',
          signature: 'bar',
        },
      });
      store.and.returnValue({results: [], pagination: {skip_token: null}});
      const grants = await auth.apiAuthorize(request);
      expect(grants.length > 0).toBeTruthy();
      expect(grants[0]).toEqual(OWNER_PERMISSION);
      
    });
    
    it('should reject non-owner without rules', async () => {
      const owner = `did:test:${Math.round(Math.random() * Number.MAX_SAFE_INTEGER).toString(16)}`;
      const sender = `${owner}-not`;
      const commit = TestCommit.create();
      const request = new WriteRequest({
        iss: sender,
        aud: 'did:example:hub',
        sub: owner,
        '@context': Context,
        '@type': 'WriteRequest',
        commit: {
          protected: commit.getProtectedString(),
          payload: 'foo',
          signature: 'bar',
        },
      });
      store.and.returnValue({results: [], pagination: {skip_token: null}});
      const grants = await auth.apiAuthorize(request);
      expect(grants.length > 0).toBeFalsy();
      expect(store).toHaveBeenCalled();
    });
    
    function returnPermissionObject(grants: PermissionGrant[]) {
      const asObjects: ObjectContainer[] = [];
      const asCommits: {[id: string]: Commit} = {};
      grants.forEach((grant) => {
        const commit = TestCommit.create({
          interface: 'Permissions',
          context: PERMISSION_GRANT_CONTEXT,
          type: PERMISSION_GRANT_TYPE,
          operation: Operation.Create,
          commit_strategy: 'basic',
          sub: 'did:example:alice.id',
          kid: 'did:example:alice.id#key-1',
        }, grant);
        asCommits[commit.getHeaders().rev] = commit;
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
      commitsStore.and.callFake((query: CommitQueryRequest): Promise<CommitQueryResponse> => {
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
          const type = Math.round(Math.random() * Number.MAX_SAFE_INTEGER).toString(16);
          const object_id = (operation !== Operation.Create ? type : undefined);
          const request = new WriteRequest({
            iss: sender,
            aud: 'did:example:hub.id',
            sub: owner,
            '@context': Context,
            '@type': 'WriteRequest',
            commit: {
              protected: base64url.encode(JSON.stringify({
                interface: 'Test',
                context: 'example.com',
                type,
                operation,
                object_id,
                committed_at: new Date(Date.now()).toISOString(),
                commit_strategy: 'basic',
                sub: owner,
                kid: `${sender}#key-1`
              })),
              payload: 'foo',
              signature: 'bar'
            }
          });
          const permission = {
            owner,
            grantee: sender,
            allow: allowString,
            context: 'example.com',
            type,
          }
          returnPermissionObject([permission])
          const returnedPermissions = await auth.apiAuthorize(request)
          expect(returnedPermissions.length > 0).toBeTruthy();
          expect(returnedPermissions[0]).toEqual(permission);
        }
        
        it('should accept for create requests', async () => {
          await checkPermissionFor(Operation.Create, 'C----');
        });
        it('should accept for read requests', async () => {
          const owner = 'did:example:alice.id';
          const sender = `${owner}-not`;
          const type = Math.round(Math.random() * Number.MAX_SAFE_INTEGER).toString(16);
          const request = new ObjectQueryRequest({
            iss: sender,
            aud: 'did:example:hub.id',
            sub: owner,
            '@context': Context,
            '@type': 'ObjectQueryRequest',
            query: {
              interface: 'Collections',
              context: 'example.com',
              type,
            }
          });
          const permission = {
            owner,
            grantee: sender,
            allow: '-R---',
            context: 'example.com',
            type,
          }
          returnPermissionObject([permission])
          const returnedPermissions = await auth.apiAuthorize(request)
          expect(returnedPermissions.length > 0).toBeTruthy();
          expect(returnedPermissions[0]).toEqual(permission);
        });
        it('should accept for update requests', async () => {
          await checkPermissionFor(Operation.Update, '--U--');
        });
        it('should accept for delete requests', async () => {
          await checkPermissionFor(Operation.Delete, '---D-');
        });
        
        // it('should require the request field', async () => {
        //   const owner = `did:test:${Math.round(Math.random() * Number.MAX_SAFE_INTEGER).toString(16)}`;
        //   const sender = `${owner}-not`;
        
        //   const request = new HubRequest({
        //     iss: sender,
        //     aud: owner,
        //     '@type': 'unknown/create',
        //     payload: {
        //       data: {
        //         // nothing needs to be here
        //       },
        //     },
        //   });
        
        //   try {
        //     await auth.authorize(request);
        //     fail('Did not require request field');
        //   } catch (err) {
        //     expect(err.message).toContain('request');
        //   }
        // });
        
        // it('should require the schema field', async () => {
        //   const owner = `did:test:${Math.round(Math.random() * Number.MAX_SAFE_INTEGER).toString(16)}`;
        //   const sender = `${owner}-not`;
        
        //   const request = new HubRequest({
        //     iss: sender,
        //     aud: owner,
        //     '@type': 'unknown/create',
        //     request: {
        //     },
        //     payload: {
        //       data: {
        //         // nothing needs to be here
        //       },
        //     },
        //   });
        
        //   try {
        //     await auth.authorize(request);
        //     fail('Did not require schema field');
        //   } catch (err) {
        //     expect(err.message).toContain('schema');
        //   }
        // });
        
        // it('should ignore other permission grants by grantee', async() => {
        //   const owner = `did:test:${Math.round(Math.random() * Number.MAX_SAFE_INTEGER).toString(16)}`;
        //   const sender = `${owner}-not`;
        //   const grantee = `${owner}-grantee`;
        //   const schema = Math.round(Math.random() * Number.MAX_SAFE_INTEGER).toString(16);
        //   const request = new HubRequest({
        //     iss: sender,
        //     aud: owner,
        //     '@type': 'unknown/read',
        //     request: {
        //       schema,
        //     },
        //   });
        //   store.and.returnValues([createPermissionGrant(owner, grantee, schema, '-R---')]);
        //   expect(await auth.authorize(request)).toBeFalsy();
        //   expect(store).toHaveBeenCalled();
        // });
        
        // it('should ignore other permission grants by schema', async() => {
        //   const owner = `did:test:${Math.round(Math.random() * Number.MAX_SAFE_INTEGER).toString(16)}`;
        //   const sender = `${owner}-not`;
        //   const schema = Math.round(Math.random() * Number.MAX_SAFE_INTEGER).toString(16);
        //   const permissionSchema = `${schema}-not`;
        //   const request = new HubRequest({
        //     iss: sender,
        //     aud: owner,
        //     '@type': 'unknown/read',
        //     request: {
        //       schema,
        //     },
        //   });
        //   store.and.returnValues([createPermissionGrant(owner, sender, permissionSchema, '-R---')]);
        //   expect(await auth.authorize(request)).toBeFalsy();
        //   expect(store).toHaveBeenCalled();
        // });
        
        // it('should ignore other permission grants by operation', async() => {
        //   const owner = `did:test:${Math.round(Math.random() * Number.MAX_SAFE_INTEGER).toString(16)}`;
        //   const sender = `${owner}-not`;
        //   const schema = Math.round(Math.random() * Number.MAX_SAFE_INTEGER).toString(16);
        //   const request = new HubRequest({
        //     iss: sender,
        //     aud: owner,
        //     '@type': 'unknown/create',
        //     request: {
        //       schema,
        //     },
        //     payload: {
        //       data: {
        //         // nothing needs to be here
        //       },
        //     },
        //   });
        //   store.and.returnValues([createPermissionGrant(owner, sender, schema, '-R---')]);
        //   expect(await auth.authorize(request)).toBeFalsy();
        //   expect(store).toHaveBeenCalled();
        // });
        
        // it('should fail if the operation could not be identified', async() => {
        //   const owner = `did:test:${Math.round(Math.random() * Number.MAX_SAFE_INTEGER).toString(16)}`;
        //   const sender = `${owner}-not`;
        //   const schema = Math.round(Math.random() * Number.MAX_SAFE_INTEGER).toString(16);
        //   const request = new HubRequest({
        //     iss: sender,
        //     aud: owner,
        //     '@type': 'unknown/unknown',
        //     request: {
        //       schema,
        //     },
        //   });
        //   try {
        //     await auth.authorize(request);
        //     fail('Did not fail for unknown operation');
        //   } catch (err) {
        //     expect(err.message).toContain('operation');
        //   }
        // })
      });
    });
    