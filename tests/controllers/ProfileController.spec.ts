import HubRequest from '../../lib/models/HubRequest';
import HubResponse from '../../lib/models/HubResponse';
// import HubError from '../../lib/models/HubError';
import ProfileController, { PROFILE_SCHEMA } from '../../lib/controllers/ProfileController';
import TestContext from '../mocks/TestContext';
import HubError from '../../lib/models/HubError';

const did = 'did:test:alice.id';

describe('ProfileController', () => {
  let testContext: TestContext;
  let storeCreate: jasmine.Spy;
  let storeQuery: jasmine.Spy;
  let storeUpdate: jasmine.Spy;
  let storeDelete: jasmine.Spy;
  let controller: ProfileController;

  let request: HubRequest;
  beforeEach(() => {
    testContext = new TestContext();
    storeCreate = spyOn(testContext.store, 'createDocument');
    storeQuery = spyOn(testContext.store, 'queryDocuments');
    storeUpdate = spyOn(testContext.store, 'updateDocument');
    storeDelete = spyOn(testContext.store, 'deleteDocument');
    // HubResponse is looped out to avoid unwrapping nested response objects
    spyOn(HubResponse, 'withObject').and.callFake((obj: any) => obj);
    spyOn(HubResponse, 'withObjects').and.callFake((obj: any) => obj);
    spyOn(HubResponse, 'withError').and.callFake((obj: any) => obj);
    controller = new ProfileController(testContext);
    request = new HubRequest({
      iss: did,
      aud: did,
      '@type': 'Profile/<ACTION>',
    });
  });

  function queryReturnEmpty() {
    storeQuery.and.returnValues([]);
  }

  function queryReturnProfile(): any {
    const store = {
      owner: did,
      id: Math.round(Math.random() * Number.MAX_SAFE_INTEGER).toString(16),
      schema: PROFILE_SCHEMA,
      payload: {
        test: Math.round(Math.random() * Number.MAX_SAFE_INTEGER).toString(16),
      },
    };

    storeQuery.and.returnValues([store]);
    return store;
  }

  function queryReturnMultiple(): string[] {
    const aObject = Math.round(Math.random() * Number.MAX_SAFE_INTEGER).toString(16);
    const bObject = Math.round(Math.random() * Number.MAX_SAFE_INTEGER).toString(16);
    storeQuery.and.returnValues([
      {
        owner: did,
        id: aObject,
        schema: PROFILE_SCHEMA,
        payload: {
          test: Math.round(Math.random() * Number.MAX_SAFE_INTEGER).toString(16),
        },
      },
      {
        owner: did,
        id: bObject,
        schema: PROFILE_SCHEMA,
        payload: {
          test: Math.round(Math.random() * Number.MAX_SAFE_INTEGER).toString(16),
        },
      }]);
    return [aObject, bObject];
  }

  describe('handleCreateRequest', () => {
    it('should call create if a Profile cannot be found', async () => {
      queryReturnEmpty();
      const testObject = {
        test: Math.round(Math.random() * Number.MAX_SAFE_INTEGER).toString(16),
      };
      storeCreate.and.returnValue(testObject);
      request.payload = {
        data: {
          unused: Math.round(Math.random() * Number.MAX_SAFE_INTEGER).toString(16),
        },
      };
      const result = await controller.handleCreateRequest(request);
      expect(storeCreate).toHaveBeenCalledWith({
        owner: did,
        schema: PROFILE_SCHEMA,
        meta: undefined,
        payload: request.payload.data,
      });
      expect(result as any).toEqual(testObject);
    });

    it('should call update if a Profile already exists', async() => {
      const profile = queryReturnProfile();
      const testObject = {
        test: Math.round(Math.random() * Number.MAX_SAFE_INTEGER).toString(16),
      };
      storeUpdate.and.returnValue(testObject);
      request.payload = {
        data: {
          unused: Math.round(Math.random() * Number.MAX_SAFE_INTEGER).toString(16),
        },
      };
      const result = await controller.handleCreateRequest(request);
      expect(storeUpdate).toHaveBeenCalledWith({
        owner: did,
        schema: PROFILE_SCHEMA,
        id: profile.id,
        meta: undefined,
        payload: request.payload.data,
      });
      expect(result as any).toEqual(testObject);
    });
  });

  describe('handleUpdateRequest', () => {
    it('should call create if a Profile cannot be found', async () => {
      queryReturnEmpty();
      const testObject = {
        test: Math.round(Math.random() * Number.MAX_SAFE_INTEGER).toString(16),
      };
      storeCreate.and.returnValue(testObject);
      request.payload = {
        data: {
          unused: Math.round(Math.random() * Number.MAX_SAFE_INTEGER).toString(16),
        },
      };
      const result = await controller.handleUpdateRequest(request);
      expect(storeCreate).toHaveBeenCalledWith({
        owner: did,
        schema: PROFILE_SCHEMA,
        meta: undefined,
        payload: request.payload.data,
      });
      expect(result as any).toEqual(testObject);
    });

    it('should call update if a Profile already exists', async() => {
      const profile = queryReturnProfile();
      const testObject = {
        test: Math.round(Math.random() * Number.MAX_SAFE_INTEGER).toString(16),
      };
      storeUpdate.and.returnValue(testObject);
      request.payload = {
        data: {
          unused: Math.round(Math.random() * Number.MAX_SAFE_INTEGER).toString(16),
        },
      };
      const result = await controller.handleUpdateRequest(request);
      expect(storeUpdate).toHaveBeenCalledWith({
        owner: did,
        schema: PROFILE_SCHEMA,
        id: profile.id,
        meta: undefined,
        payload: request.payload.data,
      });
      expect(result as any).toEqual(testObject);
    });
  });

  describe('handleExecuteRequest', () => {
    it('should throw a HubError', async () => {
      try {
        await controller.handleExecuteRequest(request);
        fail('Execute should not be implemented.');
      } catch (err) {
        if (err instanceof HubError) {
          expect(err.httpStatusCode).not.toEqual(200);
        } else {
          fail('Expected a HubError');
        }
      }
    });
  });

  describe('handleReadRequest', () => {
    it('should return the stored Profile', async () => {
      const profile = queryReturnProfile();
      const response = await controller.handleReadRequest(request);
      expect(storeQuery).toHaveBeenCalledWith({
        owner: did,
        schema: PROFILE_SCHEMA,
      });
      expect(response as any).toEqual(profile);
    });

    it('should return an empty object when no profile is found', async () => {
      queryReturnEmpty();
      const response: any = await controller.handleReadRequest(request);
      expect(storeQuery).toHaveBeenCalledWith({
        owner: did,
        schema: PROFILE_SCHEMA,
      });
      expect(response.owner).toEqual(did);
      expect(response.schema).toEqual(PROFILE_SCHEMA);
      expect(response.payload).toEqual({});
    });

    it('should return the a single Profile if multiple are found', async () => {
      const profiles = queryReturnMultiple();
      const response: any = await controller.handleReadRequest(request);
      expect(storeQuery).toHaveBeenCalledWith({
        owner: did,
        schema: PROFILE_SCHEMA,
      });
      expect(typeof response).not.toEqual('Array');
      expect(response.owner).toEqual(did);
      expect(response.schema).toEqual(PROFILE_SCHEMA);
      expect(profiles.includes(response.id)).toBeTruthy();
    });
  });

  describe('handleDeleteRequest', () => {
    it('should call query', async () => {
      queryReturnEmpty();
      await controller.handleDeleteRequest(request);
      expect(storeQuery).toHaveBeenCalledWith({
        owner: did,
        schema: PROFILE_SCHEMA,
      });
    });

    it('should delete queried objects', async () => {
      const profile = queryReturnProfile();
      storeDelete.and.callFake((deleteOptions: any) => {
        expect(deleteOptions.id).toEqual(profile.id);
        expect(deleteOptions.owner).toEqual(did);
      });
      await controller.handleDeleteRequest(request);
      expect(storeDelete).toHaveBeenCalled();
    });

    it('should delete all profiles if multiple exist', async () => {
      const profiles = queryReturnMultiple();
      const calledIds: string[] = [];
      storeDelete.and.callFake((deleteOptions: any) => {
        expect(profiles.includes(deleteOptions.id)).toBeTruthy();
        expect(deleteOptions.owner).toEqual(did);
        calledIds.push(deleteOptions.id);
      });
      await controller.handleDeleteRequest(request);
      expect(storeDelete).toHaveBeenCalledTimes(profiles.length);
      expect(calledIds).toEqual(profiles);
    });
  });
});
