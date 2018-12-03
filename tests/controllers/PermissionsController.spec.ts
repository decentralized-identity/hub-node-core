import WriteRequest from '../../lib/models/WriteRequest';
import { Context } from '../models/BaseRequest.spec';
import TestCommit from '../mocks/TestCommit';
import TestContext from '../mocks/TestContext';
import PermissionsController from '../../lib/controllers/PermissionsController';
import TestAuthorization from '../mocks/TestAuthorization';
import HubError, { ErrorCode, DeveloperMessage } from '../../lib/models/HubError';
import PermissionGrant, { PERMISSION_GRANT_TYPE, PERMISSION_GRANT_CONTEXT } from '../../lib/models/PermissionGrant';
import StoreUtils from '../../lib/utilities/StoreUtils';
import WriteResponse from '../../lib/models/WriteResponse';
import { Store } from '../../lib/interfaces/Store';
import ObjectQueryRequest from '../../lib/models/ObjectQueryRequest';
import { QueryEqualsFilter } from '../../lib/interfaces/Store';
import ObjectContainer from '../../lib/interfaces/ObjectContainer';
import AuthorizationController from '../../lib/controllers/AuthorizationController';

function getHex(): string {
  return Math.round(Math.random() * Number.MAX_SAFE_INTEGER).toString(16);
}

describe('PermissionsController', () => {
  const context = new TestContext();
  const auth = new TestAuthorization();
  const controller = new PermissionsController(context, auth);

  describe('validateSchema', () => {
    const handlers = [controller.handleCreateRequest, controller.handleDeleteRequest, controller.handleUpdateRequest];

    it('should ensure that permissions are using the correct context', async () => {
      const owner = `did:example:${getHex()}`;
      const hub = 'did:example:hub';
      const sender = `${owner}-not`;
      const writeRequest = new WriteRequest({
        '@context': Context,
        '@type': 'WriteRequest',
        iss: sender,
        aud: hub,
        sub: owner,
        commit: {
          protected: TestCommit.create({
            sub: owner,
            kid: `${owner}#key-1`,
            type: PERMISSION_GRANT_TYPE,
            commit_strategy: 'basic',
          }).getProtectedString(),
          payload: 'foo',
          signature: 'bar'
        },
      });
      for (let i = 0; i < handlers.length; i++) {
        try {
          await handlers[i](writeRequest, []);
          fail('did not throw');
        } catch (err) {
          if (!(err instanceof HubError)) {
            fail(err.message);
          }
          expect(err.errorCode).toEqual(ErrorCode.BadRequest);
        }
      };
    });

    it('should ensure that permissions are using the correct type', async () => {
      const owner = `did:example:${getHex()}`;
      const hub = 'did:example:hub';
      const sender = `${owner}-not`;
      const writeRequest = new WriteRequest({
        '@context': Context,
        '@type': 'WriteRequest',
        iss: sender,
        aud: hub,
        sub: owner,
        commit: {
          protected: TestCommit.create({
            sub: owner,
            kid: `${owner}#key-1`,
            context: PERMISSION_GRANT_CONTEXT,
            commit_strategy: 'basic',
          }).getProtectedString(),
          payload: 'foo',
          signature: 'bar'
        },
      });
      for (let i = 0; i < handlers.length; i++) {
        try {
          await handlers[i](writeRequest, []);
          fail('did not throw');
        } catch (err) {
          if (!(err instanceof HubError)) {
            fail(err.message);
          }
          expect(err.errorCode).toEqual(ErrorCode.BadRequest);
        }
      };
    });
  });

  describe('validateStrategy', () => {
    it('should require the \'basic\' strategy', async () => {
      const owner = `did:example:${getHex()}`;
      const hub = 'did:example:hub';
      const sender = `${owner}-not`;

      let commit = TestCommit.create({
        sub: owner,
        kid: `${owner}#key-1`,
        context: PERMISSION_GRANT_CONTEXT,
        type: PERMISSION_GRANT_TYPE,
        commit_strategy: 'totally-not-basic',
      }, {
        owner,
        grantee: sender,
        allow: 'C----',
        context: 'example.com',
        type: 'foo'
      });
      let writeRequest = new WriteRequest({
        '@context': Context,
        '@type': 'WriteRequest',
        iss: sender,
        aud: hub,
        sub: owner,
        commit: {
          protected: commit.getProtectedString(),
          payload: commit.getPayloadString(),
          signature: 'baz'
        },
      });
      await [controller.handleCreateRequest, controller.handleUpdateRequest].forEach(async (handler) => {
        try {
          await handler(writeRequest, []);
          fail('did not throw');
        } catch (err) {
          if (!(err instanceof HubError)) {
            fail(err.message);
          }
          expect(err.errorCode).toEqual(ErrorCode.BadRequest);
          expect(err.property).toEqual(`commit.protected.commit_strategy`);
        }
      })
    });
  })

  describe('getPermisionGrant', () => {
    it('should verify all parameters exist', async () => {
      const owner = `did:example:${getHex()}`;
      const hub = 'did:example:hub';
      const sender = `${owner}-not`;

      const fullPermission = {
        owner,
        grantee: sender,
        allow: 'C----',
        context: 'example.com',
        type: 'foo'
      };

      for (const property in fullPermission) {
        const permission: any = Object.assign({}, fullPermission);
        delete permission[property];

        let commit = TestCommit.create({
          sub: owner,
          kid: `${owner}#key-1`,
          context: PERMISSION_GRANT_CONTEXT,
          type: PERMISSION_GRANT_TYPE,
          commit_strategy: 'basic',
        }, permission);
        let writeRequest = new WriteRequest({
          '@context': Context,
          '@type': 'WriteRequest',
          iss: sender,
          aud: hub,
          sub: owner,
          commit: {
            protected: commit.getProtectedString(),
            payload: commit.getPayloadString(),
            signature: 'baz'
          },
        });
        try {
          await controller.handleCreateRequest(writeRequest, []);
          fail('did not throw');
        } catch (err) {
          if (!(err instanceof HubError)) {
            fail(err.message);
          }
          expect(err.errorCode).toEqual(ErrorCode.BadRequest);
          expect(err.property).toEqual(`commit.payload.${property}`);
          expect(err.developerMessage).toEqual(DeveloperMessage.MissingParameter);
        }
        permission[property] = true;

        commit = TestCommit.create({
          sub: owner,
          kid: `${owner}#key-1`,
          context: PERMISSION_GRANT_CONTEXT,
          type: PERMISSION_GRANT_TYPE,
          commit_strategy: 'basic',
        }, permission);
        writeRequest = new WriteRequest({
          '@context': Context,
          '@type': 'WriteRequest',
          iss: sender,
          aud: hub,
          sub: owner,
          commit: {
            protected: commit.getProtectedString(),
            payload: commit.getPayloadString(),
            signature: 'baz'
          },
        });
        try {
          await controller.handleCreateRequest(writeRequest, []);
          fail('did not throw');
        } catch (err) {
          if (!(err instanceof HubError)) {
            fail(err.message);
          }
          expect(err.errorCode).toEqual(ErrorCode.BadRequest);
          expect(err.property).toEqual(`commit.payload.${property}`);
          expect(err.developerMessage).toEqual(DeveloperMessage.IncorrectParameter);
        }
      }
    });
  })

  describe('validatePermissionGrant', () => {
    it('should forbid making a CREATE permission with created_by', async () => {
      const owner = `did:example:${getHex()}`;
      const hub = 'did:example:hub';
      const sender = `${owner}-not`;
      const commit = TestCommit.create({
        sub: owner,
        kid: `${owner}#key-1`,
        context: PERMISSION_GRANT_CONTEXT,
        type: PERMISSION_GRANT_TYPE,
        commit_strategy: 'basic',
      }, {
        owner,
        grantee: sender,
        allow: 'C----',
        context: 'example.com',
        type: 'foo',
        created_by: 'bar'
      } as PermissionGrant);
      const writeRequest = new WriteRequest({
        '@context': Context,
        '@type': 'WriteRequest',
        iss: sender,
        aud: hub,
        sub: owner,
        commit: {
          protected: commit.getProtectedString(),
          payload: commit.getPayloadString(),
          signature: 'baz'
        },
      });
      try {
        await controller.handleCreateRequest(writeRequest, []);
        fail('did not throw');
      } catch (err) {
        if (!(err instanceof HubError)) {
          fail(err.message);
        }
        expect(err.errorCode).toEqual(ErrorCode.BadRequest);
        expect(err.property).toEqual('commit.payload.created_by');
      }
    });
  });

  describe('handleCreateRequest', () => {
    it('should create an object if valid', async () => {
      const owner = `did:example:${getHex()}`;
      const hub = 'did:example:hub';
      const sender = `${owner}-not`;
      const commit = TestCommit.create({
        sub: owner,
        kid: `${owner}#key-1`,
        context: PERMISSION_GRANT_CONTEXT,
        type: PERMISSION_GRANT_TYPE,
        commit_strategy: 'basic',
      }, {
        owner,
        grantee: sender,
        allow: 'C----',
        context: 'example.com',
        type: 'foo',
      } as PermissionGrant);
      const writeRequest = new WriteRequest({
        '@context': Context,
        '@type': 'WriteRequest',
        iss: sender,
        aud: hub,
        sub: owner,
        commit: {
          protected: commit.getProtectedString(),
          payload: commit.getPayloadString(),
          signature: 'baz'
        },
      });
      const response = getHex();
      const spy = spyOn(StoreUtils, 'writeCommit').and.callFake((request: WriteRequest, store: Store) => {
        expect(request).toEqual(writeRequest);
        expect(store).toEqual(context.store);
        return new WriteResponse([response]);
      });
      const result = await controller.handleCreateRequest(writeRequest, []);
      expect(result.revisions.length).toEqual(1);
      expect(result.revisions[0]).toEqual(response);
      expect(spy).toHaveBeenCalled();
    })
  });

  describe('validateObjectExists', () => {
    it('should throw if the object does not exist', async () => {
      const owner = `did:example:${getHex()}`;
      const hub = 'did:example:hub';
      const sender = `${owner}-not`;
      const commit = TestCommit.create({
        sub: owner,
        kid: `${owner}#key-1`,
        context: PERMISSION_GRANT_CONTEXT,
        type: PERMISSION_GRANT_TYPE,
        commit_strategy: 'basic',
      }, {
        owner,
        grantee: sender,
        allow: 'C----',
        context: 'example.com',
        type: 'foo',
      } as PermissionGrant);
      const writeRequest = new WriteRequest({
        '@context': Context,
        '@type': 'WriteRequest',
        iss: sender,
        aud: hub,
        sub: owner,
        commit: {
          protected: commit.getProtectedString(),
          payload: commit.getPayloadString(),
          signature: 'baz'
        },
      });
      const spy = spyOn(StoreUtils, 'objectExists').and.callFake((request: WriteRequest, _: Store, __: PermissionGrant[]) => {
        expect(request).toEqual(writeRequest);
        return false;
      });
      try {
        await controller.handleUpdateRequest(writeRequest, []);
        fail('should have thrown');
      } catch (err) {
        if (!(err instanceof HubError)) {
          fail(err.message);
        }
        expect(err.errorCode).toEqual(ErrorCode.NotFound);
        expect(spy).toHaveBeenCalled();
      }
      try {
        await controller.handleDeleteRequest(writeRequest, []);
        fail('should have thrown');
      } catch (err) {
        if (!(err instanceof HubError)) {
          fail(err.message);
        }
        expect(err.errorCode).toEqual(ErrorCode.NotFound);
        expect(spy).toHaveBeenCalled();
      }
    });
  });

  describe('handleUpdateRequest and handleDeleteRequest', () => {
    it('should call store', async () => {
      const owner = `did:example:${getHex()}`;
      const hub = 'did:example:hub';
      const sender = `${owner}-not`;
      const commit = TestCommit.create({
        sub: owner,
        kid: `${owner}#key-1`,
        context: PERMISSION_GRANT_CONTEXT,
        type: PERMISSION_GRANT_TYPE,
        commit_strategy: 'basic',
      }, {
        owner,
        grantee: sender,
        allow: 'C----',
        context: 'example.com',
        type: 'foo',
      } as PermissionGrant);
      const writeRequest = new WriteRequest({
        '@context': Context,
        '@type': 'WriteRequest',
        iss: sender,
        aud: hub,
        sub: owner,
        commit: {
          protected: commit.getProtectedString(),
          payload: commit.getPayloadString(),
          signature: 'baz'
        },
      });
      const spy = spyOn(StoreUtils, 'objectExists').and.callFake((request: WriteRequest, _: Store, __: PermissionGrant[]) => {
        expect(request).toEqual(writeRequest);
        return true;
      });
      const response = getHex();
      const spyWrite = spyOn(StoreUtils, 'writeCommit').and.callFake((request: WriteRequest, storeCalled: Store) => {
        expect(storeCalled).toEqual(context.store);
        expect(request).toEqual(writeRequest);
        return new WriteResponse([response]);
      });
      let result = await controller.handleUpdateRequest(writeRequest, []);
      expect(result.revisions[0]).toEqual(response);
      expect(spy).toHaveBeenCalled();
      expect(spyWrite).toHaveBeenCalled();
      result = await controller.handleDeleteRequest(writeRequest, []);
      expect(result.revisions[0]).toEqual(response);
      expect(spy).toHaveBeenCalled();
      expect(spyWrite).toHaveBeenCalled();
    });
  });

  describe('handleQueryRequest', () => {

    it('should verify the context', async () => {
      const owner = `did:example:${getHex()}`;
      const hub = 'did:example:hub';
      const sender = `${owner}-not`;
      const queryRequest = new ObjectQueryRequest({
        '@context': Context,
        '@type': 'WriteRequest',
        iss: sender,
        aud: hub,
        sub: owner,
        query: {
          interface: 'Permissions',
          context: 'not the right one',
          type: PERMISSION_GRANT_TYPE
        }
      });
      const spy = spyOn(context.store, "queryObjects");
      try {
        await controller.handleQueryRequest(queryRequest, []);
        fail('did not throw');
      } catch (err) {
        if (!(err instanceof HubError)) {
          fail(err.message);
        }
        expect(err.errorCode).toEqual(ErrorCode.BadRequest);
      }
      expect(spy).not.toHaveBeenCalled();
    });

    it('should verify the type', async () => {
      const owner = `did:example:${getHex()}`;
      const hub = 'did:example:hub';
      const sender = `${owner}-not`;
      const queryRequest = new ObjectQueryRequest({
        '@context': Context,
        '@type': 'WriteRequest',
        iss: sender,
        aud: hub,
        sub: owner,
        query: {
          interface: 'Permissions',
          context: PERMISSION_GRANT_CONTEXT,
          type: 'incorrect type',
        }
      });
      const spy = spyOn(context.store, "queryObjects");
      try {
        await controller.handleQueryRequest(queryRequest, []);
        fail('did not throw');
      } catch (err) {
        if (!(err instanceof HubError)) {
          fail(err.message);
        }
        expect(err.errorCode).toEqual(ErrorCode.BadRequest);
      }
      expect(spy).not.toHaveBeenCalled();
    });

    it('should query store with the correct filters', async () => {
      const owner = `did:example:${getHex()}`;
      const hub = 'did:example:hub';
      const sender = `${owner}-not`;
      const queryRequest = new ObjectQueryRequest({
        '@context': Context,
        '@type': 'WriteRequest',
        iss: sender,
        aud: hub,
        sub: owner,
        query: {
          interface: 'Permissions',
          context: PERMISSION_GRANT_CONTEXT,
          type: PERMISSION_GRANT_TYPE
        }
      });
      const spy = spyOn(context.store, "queryObjects").and.callFake((query: any) => {
        expect(query.owner).toEqual(owner);
        expect(query.filters).toBeDefined();
        expect(query.filters.length).toEqual(3);
        let found = 0;
        query.filters.forEach((filter: QueryEqualsFilter) => {
          switch (filter.field) {
            case 'interface':
              expect(filter.type).toEqual('eq');
              expect(filter.value).toEqual('Permissions');
              found++;
              break;
            case 'context':
              expect(filter.type).toEqual('eq');
              expect(filter.value).toEqual(PERMISSION_GRANT_CONTEXT);
              found++;
              break;
            case 'type':
              expect(filter.type).toEqual('eq');
              expect(filter.value).toEqual(PERMISSION_GRANT_TYPE);
              found++;
              break;
            default:
              fail('unknown filter passed to store');
          }
        });
        expect(found).toEqual(3);
        return {
          results: [],
          pagination: {
            skip_token: null,
          },
        };
      });
      controller.handleQueryRequest(queryRequest, []);
      expect(spy).toHaveBeenCalled();
    });

    it('should prune results', async () => {
      const owner = `did:example:${getHex()}`;
      const hub = 'did:example:hub';
      const sender = `${owner}-not`;
      const queryRequest = new ObjectQueryRequest({
        '@context': Context,
        '@type': 'WriteRequest',
        iss: sender,
        aud: hub,
        sub: owner,
        query: {
          interface: 'Permissions',
          context: PERMISSION_GRANT_CONTEXT,
          type: PERMISSION_GRANT_TYPE
        }
      });
      const grant: PermissionGrant = {
        owner,
        grantee: sender,
        allow: '-R---',
        context: 'example.com',
        type: 'foobarbaz'
      }
      const objectId = getHex();
      const spy = spyOn(context.store, "queryObjects").and.returnValue({
        results: [{
          interface: 'Permissions',
          context: PERMISSION_GRANT_CONTEXT,
          type: PERMISSION_GRANT_TYPE,
          id: objectId,
          created_by: owner,
          created_at: new Date(Date.now()).toISOString(),
          sub: owner,
          commit_strategy: 'basic'
        } as ObjectContainer],
        pagination: {
          skip_token: null,
        },
      });
      const pruneSpy = spyOn(AuthorizationController, 'pruneResults').and.callFake((objects: ObjectContainer[], grants: PermissionGrant[]) => {
        expect(grants[0]).toEqual(grant);
        expect(objects[0].id).toEqual(objectId);
        return objects;
      });
      const result = await controller.handleQueryRequest(queryRequest, [grant]);
      expect(spy).toHaveBeenCalled();
      expect(pruneSpy).toHaveBeenCalled();
      expect(result.objects[0].id).toEqual(objectId);
    });
  });
});
