import PermissionsController from '../../lib/controllers/PermissionsController';
import TestContext from '../mocks/TestContext';
import TestAuthorization from '../mocks/TestAuthorization';
import TestStore from '../mocks/TestStore';
import HubRequest from '../../lib/models/HubRequest';
import { PERMISSION_GRANT_SCHEMA } from '../../lib/models/PermissionGrant';

describe('PermissionsController', () => {
  let permissionsController: PermissionsController;
  let store: TestStore;

  beforeEach(() => {
    const context = new TestContext();
    const authorization = new TestAuthorization();
    permissionsController = new PermissionsController(context, authorization);
    store = context.store;
  });

  describe('validateSchema', () => {
    it('should require a schema', async () => {
      const request = makeRequest({}, {});
      try {
        await permissionsController.handleCreateRequest(request);
        fail('should have thrown');
      } catch (err) {
        expect(err.message).toContain('schema');
      }
    });

    it('should require the PermissionGrant schema', async () => {
      const request = makeRequest({}, { schema: 'test' });
      try {
        await permissionsController.handleCreateRequest(request);
        fail('should have thrown');
      } catch (err) {
        expect(err.message).toContain(PERMISSION_GRANT_SCHEMA);
      }
    });
  });

  describe('getPermissionGrant', () => {
    it('should require a payload', async () => {
      const request = makeRequest(undefined);
      try {
        await permissionsController.handleCreateRequest(request);
        fail('should have thrown');
      } catch (err) {
        expect(err.message).toContain('payload');
      }
    });

    it('should validate the data', async () => {
      const request = makeRequest({});
      try {
        await permissionsController.handleCreateRequest(request);
        fail('should have thrown');
      } catch (err) {
        expect(err.message).toContain('PermissionGrant');
      }
    });

    it('should return the contained data', async() => {
      const permission = makePermission();
      const request = makeRequest(permission);
      spyOn(store, 'createDocument').and.callFake((document: any) => document);
      const result = await permissionsController.handleCreateRequest(request);
      const response: any = result.getResponseBody().payload[0].data;
      expect(response).toEqual(permission);
    });
  });

  describe('handleCreateRequest', () => {
    it('should return the stored data', async() => {
      const permission = makePermission();
      const request = makeRequest(permission);
      spyOn(store, 'createDocument').and.callFake((document: any) => document);
      const result = await permissionsController.handleCreateRequest(request);
      const response: any = result.getResponseBody().payload[0].data;
      expect(response).toEqual(permission);
    });

    it('should validate the schema', async() => {
      checkValidateSchemaIsCalled(async (request) => {await permissionsController.handleCreateRequest(request)});
    });

    it('should validate the payload', async () => {
      checkGetPermissionGrantIsCalled(async (request) => {await permissionsController.handleCreateRequest(request)})
    });
  });

  describe('handleExecuteRequest', () => {
    it('should throw', async () => {
      const request = makeRequest(undefined);
      try {
        await permissionsController.handleExecuteRequest(request);
        fail('did not throw');
      } catch (err) {
        expect(err.message).toContain('implemented');
      }
    })
  });

  describe('handleReadRequest', () => {
    it('should validate the schema', async() => {
      checkValidateSchemaIsCalled(async (request) => {await permissionsController.handleReadRequest(request)});
    });

    it('should return the contained data', async() => {
      const permission = makePermission();
      const request = makeRequest(undefined);
      spyOn(store, 'queryDocuments').and.callFake((_: any) => {
        return [{
          owner: request.aud,
          id: Math.round(Math.random() * Number.MAX_SAFE_INTEGER).toString(16),
          schema: PERMISSION_GRANT_SCHEMA,
          payload: permission,
        }];
      });
      const result = await permissionsController.handleReadRequest(request);
      const response: any = result.getResponseBody().payload[0].data;
      expect(response).toEqual(permission);
    });

    it('should return nothing when an id filter is included', async () => {
      const permission = makePermission();
      const id = Math.round(Math.random() * Number.MAX_SAFE_INTEGER).toString(16);
      const request = makeRequest(undefined, {id, schema: PERMISSION_GRANT_SCHEMA});
      spyOn(store, 'queryDocuments').and.callFake((_: any) => {
        return [{
          owner: request.aud,
          id: `${id}-not`,
          schema: PERMISSION_GRANT_SCHEMA,
          payload: permission,
        }];
      });
      const result = await permissionsController.handleReadRequest(request);
      const response: any = result.getResponseBody();
      expect(response.error).toBeDefined();
    });

    it('should return only if id matches', async () => {
      const permission = makePermission();
      const id = Math.round(Math.random() * Number.MAX_SAFE_INTEGER).toString(16);
      const request = makeRequest(undefined, {id, schema: PERMISSION_GRANT_SCHEMA});
      spyOn(store, 'queryDocuments').and.callFake((_: any) => {
        return [{
          owner: request.aud,
          id: `${id}`,
          schema: PERMISSION_GRANT_SCHEMA,
          payload: permission,
        },
        {
          owner: request.aud,
          id: `${id}-not`,
          schema: PERMISSION_GRANT_SCHEMA,
          payload: {},
        }];
      });
      const result = await permissionsController.handleReadRequest(request);
      const response: any = result.getResponseBody().payload[0].data;
      expect(response).toEqual(permission);
    });
  });

  describe('handleCreateRequest', () => {
    it('should return the stored data', async() => {
      const permission = makePermission();
      const request = makeRequest(permission);
      spyOn(store, 'createDocument').and.callFake((document: any) => document);
      const result = await permissionsController.handleCreateRequest(request);
      const response: any = result.getResponseBody().payload[0].data;
      expect(response).toEqual(permission);
    });

    it('should validate the schema', async() => {
      checkValidateSchemaIsCalled(async (request) => {await permissionsController.handleCreateRequest(request)});
    });

    it('should validate the payload', async () => {
      checkGetPermissionGrantIsCalled(async (request) => {await permissionsController.handleCreateRequest(request)})
    });
  });

  describe('handleCreateRequest', () => {
    it('should return the stored data', async() => {
      const permission = makePermission();
      const request = makeRequest(permission);
      spyOn(store, 'createDocument').and.callFake((document: any) => document);
      const result = await permissionsController.handleCreateRequest(request);
      const response: any = result.getResponseBody().payload[0].data;
      expect(response).toEqual(permission);
    });

    it('should validate the schema', async() => {
      checkValidateSchemaIsCalled(async (request) => {await permissionsController.handleCreateRequest(request)});
    });

    it('should validate the payload', async () => {
      checkGetPermissionGrantIsCalled(async (request) => {await permissionsController.handleCreateRequest(request)})
    });
  });

  async function checkGetPermissionGrantIsCalled(call: (request: HubRequest) => any) {
    const spy = spyOn(PermissionsController, 'getPermissionGrant' as 'prototype').and.throwError('');
    const request = makeRequest({});
    try {
      await call(request);
    } catch (err) {
      expect(spy).toHaveBeenCalled();
    }
  }

  async function checkValidateSchemaIsCalled(call: (request: HubRequest) => any) {
    const spy = spyOn(PermissionsController, 'validateSchema' as 'prototype').and.throwError('');
    const request = makeRequest(makePermission());
    await call(request);
    try {
      await call(request);
    } catch (err) {
      expect(spy).toHaveBeenCalled();
    }
  }

  function makePermission() {
    return {
      owner: Math.round(Math.random() * Number.MAX_SAFE_INTEGER).toString(16),
      grantee: Math.round(Math.random() * Number.MAX_SAFE_INTEGER).toString(16),
      allow: '-----',
      object_type: Math.round(Math.random() * Number.MAX_SAFE_INTEGER).toString(16),
      created_by: '*',
    }
  }

  function makeRequest(permission: any, request: any = { schema: PERMISSION_GRANT_SCHEMA }): HubRequest {
    const did = `did:test:${Math.round(Math.random() * Number.MAX_SAFE_INTEGER).toString(16)}`;
    if (permission) {
      return new HubRequest({
        request,
        iss: did,
        aud: did,
        '@type': 'Permissions/Action',
        payload: {
          data: permission,
        }
      });
    }
    return new HubRequest({
      request,
      iss: did,
      aud: did,
      '@type': 'Permissions/Action'
    });
  }
})