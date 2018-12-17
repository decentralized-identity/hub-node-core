import WriteRequest from '../../lib/models/WriteRequest';
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
import BaseRequest from '../../lib/models/BaseRequest';
import { Operation } from '../../lib/models/Commit';
import TestRequest from '../mocks/TestRequest';
import TestUtilities from '../TestUtilities';

describe('PermissionsController', () => {
  const context = new TestContext();
  const auth = new TestAuthorization();
  const controller = new PermissionsController(context, auth);

  describe('validateSchema', () => {
    it('should ensure that permissions are using the correct context', async () => {
      const writeRequest = TestRequest.createWriteRequest({
        iss: 'did:example:bob.id',
        type: PERMISSION_GRANT_TYPE
      });
      try {
        await controller.handleWriteCommitRequest(writeRequest, []);
        fail('did not throw');
      } catch (err) {
        if (!(err instanceof HubError)) {
          fail(err.message);
        }
        expect(err.errorCode).toEqual(ErrorCode.BadRequest);
      }
    });

    it('should ensure that permissions are using the correct type', async () => {
      const writeRequest = TestRequest.createWriteRequest({
        iss: 'did:example:bob.id',
        context: PERMISSION_GRANT_CONTEXT
      });
      try {
        await controller.handleWriteCommitRequest(writeRequest, []);
        fail('did not throw');
      } catch (err) {
        if (!(err instanceof HubError)) {
          fail(err.message);
        }
        expect(err.errorCode).toEqual(ErrorCode.BadRequest);
      }
    });
  });

  describe('validateStrategy', () => {
    it('should require the \'basic\' strategy', async () => {
      const writeRequest = TestRequest.createWriteRequest({
        iss: 'did:example:bob.id',
        context: PERMISSION_GRANT_CONTEXT,
        type: PERMISSION_GRANT_TYPE,
        commit_strategy: 'complex',
      });
      try {
        await controller.handleWriteCommitRequest(writeRequest, []);
        fail('did not throw');
      } catch (err) {
        if (!(err instanceof HubError)) {
          fail(err.message);
        }
        expect(err.errorCode).toEqual(ErrorCode.BadRequest);
        expect(err.property).toEqual('commit.protected.commit_strategy');
      }
    });
  })

  describe('getPermisionGrant', () => {
    const fullPermission = {
      owner: 'did:example:alice.id',
      grantee: 'did:example:bob.id',
      allow: 'C----',
      context: 'example.com',
      type: 'foo'
    };

    for (const property in fullPermission) {
      it(`should verify ${property} exist`, async () => {
        const permission: any = Object.assign({}, fullPermission);
        delete permission[property];

        const writeRequest = TestRequest.createWriteRequest({
          iss: 'did:example:bob.id',
          context: PERMISSION_GRANT_CONTEXT,
          type: PERMISSION_GRANT_TYPE,
          payload: permission,
        });

        try {
          await controller.handleWriteCommitRequest(writeRequest, []);
          fail('did not throw');
        } catch (err) {
          if (!(err instanceof HubError)) {
            fail(err.message);
          }
          expect(err.errorCode).toEqual(ErrorCode.BadRequest);
          expect(err.property).toEqual(`commit.payload.${property}`);
          expect(err.developerMessage).toEqual(DeveloperMessage.MissingParameter);
        }
      });

      it(`should verify ${property} parameter is of the correct type`, async () => {
        const permission: any = Object.assign({}, fullPermission);
        permission[property] = true;
        const writeRequest = TestRequest.createWriteRequest({
          iss: 'did:example:bob.id',
          context: PERMISSION_GRANT_CONTEXT,
          type: PERMISSION_GRANT_TYPE,
          payload: permission,
        });
        try {
          await controller.handleWriteCommitRequest(writeRequest, []);
          fail('did not throw');
        } catch (err) {
          if (!(err instanceof HubError)) {
            fail(err.message);
          }
          expect(err.errorCode).toEqual(ErrorCode.BadRequest);
          expect(err.property).toEqual(`commit.payload.${property}`);
          expect(err.developerMessage).toEqual(DeveloperMessage.IncorrectParameter);
        }
      });
    }
  });

  describe('validatePermissionGrant', () => {
    it('should forbid making a CREATE permission with created_by', async () => {
      const owner = `did:example:${TestUtilities.randomString()}`;
      const sender = `${owner}-not`;
      
      const writeRequest = TestRequest.createWriteRequest({
        iss: owner,
        sub: owner,
        kid: `${owner}#key-1`,
        context: PERMISSION_GRANT_CONTEXT,
        type: PERMISSION_GRANT_TYPE,
        payload: {
          owner,
          grantee: sender,
          allow: 'C----',
          context: 'example.com',
          type: 'foo',
          created_by: 'bar'
        } as PermissionGrant,
      });

      try {
        await controller.handleWriteCommitRequest(writeRequest, []);
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

  describe('handleWriteCommitRequest', () => {
    it('should create an object if valid', async () => {
      const owner = `did:example:${TestUtilities.randomString()}`;
      const sender = `${owner}-not`;
      
      const writeRequest = TestRequest.createWriteRequest({
        iss: owner,
        sub: owner,
        kid: `${owner}#key-1`,
        context: PERMISSION_GRANT_CONTEXT,
        type: PERMISSION_GRANT_TYPE,
        payload: {
          owner,
          grantee: sender,
          allow: 'C----',
          context: 'example.com',
          type: 'foo',
        } as PermissionGrant,
      });

      const response = TestUtilities.randomString();
      const spy = spyOn(StoreUtils, 'writeCommit').and.callFake((request: WriteRequest, store: Store) => {
        expect(request).toEqual(writeRequest);
        expect(store).toEqual(context.store);
        return new WriteResponse([response]);
      });
      const result = await controller.handleWriteCommitRequest(writeRequest, []);
      expect(result.revisions.length).toEqual(1);
      expect(result.revisions[0]).toEqual(response);
      expect(spy).toHaveBeenCalled();
    })
  });

  describe('validateObjectExists', () => {
    it('should throw if the object does not exist', async () => {
      const owner = `did:example:${TestUtilities.randomString()}`;
      const sender = `${owner}-not`;

      const writeRequest = TestRequest.createWriteRequest({
        iss: owner,
        sub: owner,
        kid: `${owner}#key-1`,
        context: PERMISSION_GRANT_CONTEXT,
        type: PERMISSION_GRANT_TYPE,
        operation: Operation.Update,
        object_id: TestUtilities.randomString(),
        payload: {
          owner,
          grantee: sender,
          allow: 'C----',
          context: 'example.com',
          type: 'foo',
        } as PermissionGrant,
      });

      const testMessage = TestUtilities.randomString();
      const spy = spyOn(StoreUtils, 'validateObjectExists').and.throwError(testMessage);
      try {
        await controller.handleWriteCommitRequest(writeRequest, []);
        fail('expected to throw');
      } catch (err) {
        expect(spy).toHaveBeenCalled();
        expect(err.message).toEqual(testMessage);
      }
    });
  });

  describe('handleWriteCommitRequest', () => {
    it('should call store', async () => {
      const owner = `did:example:${TestUtilities.randomString()}`;
      const sender = `${owner}-not`;

      const writeRequest = TestRequest.createWriteRequest({
        iss: owner,
        sub: owner,
        kid: `${owner}#key-1`,
        context: PERMISSION_GRANT_CONTEXT,
        type: PERMISSION_GRANT_TYPE,
        operation: Operation.Update,
        object_id: TestUtilities.randomString(),
        payload: {
          owner,
          grantee: sender,
          allow: 'C----',
          context: 'example.com',
          type: 'foo',
        } as PermissionGrant,
      });

      const spy = spyOn(StoreUtils, 'objectExists').and.callFake((request: WriteRequest, _: Store, __: PermissionGrant[]) => {
        expect(request).toEqual(writeRequest);
        return true;
      });
      const response = TestUtilities.randomString();
      const spyWrite = spyOn(StoreUtils, 'writeCommit').and.callFake((request: WriteRequest, storeCalled: Store) => {
        expect(storeCalled).toEqual(context.store);
        expect(request).toEqual(writeRequest);
        return new WriteResponse([response]);
      });
      let result = await controller.handleWriteCommitRequest(writeRequest, []);
      expect(result.revisions[0]).toEqual(response);
      expect(spy).toHaveBeenCalled();
      expect(spyWrite).toHaveBeenCalled();
    });
  });

  describe('handleQueryRequest', () => {

    it('should verify the context', async () => {
      const owner = `did:example:${TestUtilities.randomString()}`;
      const hub = 'did:example:hub';
      const sender = `${owner}-not`;
      const queryRequest = new ObjectQueryRequest({
        '@context': BaseRequest.context,
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
      const owner = `did:example:${TestUtilities.randomString()}`;
      const hub = 'did:example:hub';
      const sender = `${owner}-not`;
      const queryRequest = new ObjectQueryRequest({
        '@context': BaseRequest.context,
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
      const owner = `did:example:${TestUtilities.randomString()}`;
      const hub = 'did:example:hub';
      const sender = `${owner}-not`;
      const queryRequest = new ObjectQueryRequest({
        '@context': BaseRequest.context,
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
      const owner = `did:example:${TestUtilities.randomString()}`;
      const hub = 'did:example:hub';
      const sender = `${owner}-not`;
      const queryRequest = new ObjectQueryRequest({
        '@context': BaseRequest.context,
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
      const objectId = TestUtilities.randomString();
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
