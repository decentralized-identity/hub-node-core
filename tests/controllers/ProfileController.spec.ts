import TestCommit from '../mocks/TestCommit';
import TestContext from '../mocks/TestContext';
import TestAuthorization from '../mocks/TestAuthorization';
import ProfileController, { PROFILE_TYPE, PROFILE_CONTEXT } from '../../lib/controllers/ProfileController';
import WriteRequest from '../../lib/models/WriteRequest';
import HubError, { ErrorCode } from '../../lib/models/HubError';
import { Store } from '../../lib/interfaces/Store';
import StoreUtils from '../../lib/utilities/StoreUtils';
import ObjectContainer from '../../lib/interfaces/ObjectContainer';
import { Operation } from '../../lib/models/Commit';
import PermissionGrant from '../../lib/models/PermissionGrant';
import WriteResponse from '../../lib/models/WriteResponse';
import ObjectQueryRequest from '../../lib/models/ObjectQueryRequest';
import BaseRequest from '../../lib/models/BaseRequest';

function getHex(): string {
  return Math.round(Math.random() * Number.MAX_SAFE_INTEGER).toString(16);
}

describe('ProfileController', () => {
  const context = new TestContext();
  const auth = new TestAuthorization();
  const controller = new ProfileController(context, auth);
  let owner: string;
  let hub: string;
  let sender: string;

  beforeEach(() => {
    owner = `did:example:${getHex()}`;
    hub = 'did:example:hub';
    sender = `${owner}-not`;
  });

  describe('validateSchema', () => {
    const handlers = [controller.handleCreateRequest, controller.handleUpdateRequest, controller.handleDeleteRequest];
    it('should throw for incorrect context', async () => {
      const owner = `did:example:${getHex()}`;
      const hub = 'did:example:hub';
      const sender = `${owner}-not`;
      const writeRequest = new WriteRequest({
        '@context': BaseRequest.context,
        '@type': 'WriteRequest',
        iss: sender,
        aud: hub,
        sub: owner,
        commit: {
          protected: TestCommit.create({
            sub: owner,
            kid: `${owner}#key-1`,
            type: PROFILE_TYPE,
            commit_strategy: 'basic',
          }).getProtectedString(),
          payload: 'foo',
          signature: 'bar'
        },
      });
      await handlers.forEach(async (handle) => {
        try {
          await handle(writeRequest, []);
          fail('did not throw');
        } catch (err) {
          if (!(err instanceof HubError)) {
            fail(err.message);
          }
          expect(err.errorCode).toEqual(ErrorCode.BadRequest);
        }
      })
    });

    it('should throw for incorrect type', async () => {
      const writeRequest = new WriteRequest({
        '@context': BaseRequest.context,
        '@type': 'WriteRequest',
        iss: sender,
        aud: hub,
        sub: owner,
        commit: {
          protected: TestCommit.create({
            sub: owner,
            kid: `${owner}#key-1`,
            context: PROFILE_CONTEXT,
            commit_strategy: 'basic',
          }).getProtectedString(),
          payload: 'foo',
          signature: 'bar'
        },
      });
      await handlers.forEach(async (handle) => {
        try {
          await handle(writeRequest, []);
          fail('did not throw');
        } catch (err) {
          if (!(err instanceof HubError)) {
            fail(err.message);
          }
          expect(err.errorCode).toEqual(ErrorCode.BadRequest);
        }
      })
    });
  });

  describe('getProfiles', () => {
    it('should form the correct store query filters', async () => {
      const writeRequest = new WriteRequest({
        '@context': BaseRequest.context,
        '@type': 'WriteRequest',
        iss: sender,
        aud: hub,
        sub: owner,
        commit: {
          protected: TestCommit.create({
            sub: owner,
            kid: `${owner}#key-1`,
            context: PROFILE_CONTEXT,
            type: PROFILE_TYPE,
            commit_strategy: 'basic',
          }).getProtectedString(),
          payload: 'foo',
          signature: 'bar'
        },
      });
      const spy = spyOn(context.store, "queryObjects").and.callFake((request: any) => {
        expect(request.owner).toEqual(owner);
        expect(request.filters).toBeDefined();
        expect(request.filters.length).toEqual(3);
        let countFound = 0;
        request.filters.forEach((filter: any) => {
          switch (filter.field) {
            case 'interface':
              expect(filter.type).toEqual('eq');
              expect(filter.value).toEqual('Profile');
              countFound++;
              break;
            case 'context':
              expect(filter.type).toEqual('eq');
              expect(filter.value).toEqual(PROFILE_CONTEXT);
              countFound++;
              break;
            case 'type':
              expect(filter.type).toEqual('eq');
              expect(filter.value).toEqual(PROFILE_TYPE);
              countFound++;
              break;
            default:
              fail('unknown filter used');
          }
        });
        expect(countFound).toEqual(3);
        return {
          results: [],
          pagination: {
            skip_token: null,
          },
        };
      });
      spyOn(StoreUtils, 'writeCommit');
      await controller.handleCreateRequest(writeRequest, []);
      expect(spy).toHaveBeenCalled();
    });
  });

  describe('handleCreateRequest', () => {
    it('should throw if a profile already exists', async () => {
      const spy = spyOn(context.store, 'queryObjects').and.returnValue({
        results: [{
          interface: 'Profile',
          context: PROFILE_CONTEXT,
          type: PROFILE_TYPE,
          id: getHex(),
          created_by: 'did:example:alice.id',
          created_at: new Date(Date.now()).toISOString(),
          sub: 'did:example:alice.id',
          commit_strategy: 'basic',
          } as ObjectContainer
        ],
        pagination: {
          skip_token: null,
        }});
      const writeRequest = new WriteRequest({
        '@context': BaseRequest.context,
        '@type': 'WriteRequest',
        iss: sender,
        aud: hub,
        sub: owner,
        commit: {
          protected: TestCommit.create({
            sub: owner,
            kid: `${owner}#key-1`,
            context: PROFILE_CONTEXT,
            type: PROFILE_TYPE,
            commit_strategy: 'basic',
            operation: Operation.Create
          }).getProtectedString(),
          payload: 'foo',
          signature: 'bar'
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
      }
      
      expect(spy).toHaveBeenCalled();
    });

    it('should call store if the create is valid', async () => {
      const commit = TestCommit.create({
        sub: owner,
        kid: `${owner}#key-1`,
        context: PROFILE_CONTEXT,
        type: PROFILE_TYPE,
        commit_strategy: 'basic',
        operation: Operation.Create
      }, {
        title: 'Test'
      });
      const writeRequest = new WriteRequest({
        '@context': BaseRequest.context,
        '@type': 'WriteRequest',
        iss: sender,
        aud: hub,
        sub: owner,
        commit: {
          protected: commit.getProtectedString(),
          payload: commit.getPayloadString(),
          signature: 'bar'
        },
      });
      spyOn(context.store, 'queryObjects').and.returnValue({
        results: [],
        pagination: {
          skip_token: null,
        },
      });
      const spy = spyOn(StoreUtils, 'writeCommit').and.callFake((request: WriteRequest, store: Store) => {
        expect(store).toEqual(context.store);
        expect(request).toEqual(writeRequest);
      });
      await controller.handleCreateRequest(writeRequest, []);
      expect(spy).toHaveBeenCalled();
    });
  });

  describe('handleUpdateRequest and handleDeleteRequest', () => {
    it('should fail if the profile does not exist', async () => {
      const commit = TestCommit.create({
        sub: owner,
        kid: `${owner}#key-1`,
        context: PROFILE_CONTEXT,
        type: PROFILE_TYPE,
        commit_strategy: 'basic',
        operation: Operation.Update,
        object_id: getHex(),
      }, {
        title: 'Test'
      });
      const writeRequest = new WriteRequest({
        '@context': BaseRequest.context,
        '@type': 'WriteRequest',
        iss: sender,
        aud: hub,
        sub: owner,
        commit: {
          protected: commit.getProtectedString(),
          payload: commit.getPayloadString(),
          signature: 'bar'
        },
      });
      const grant: PermissionGrant = {
        owner,
        grantee: sender,
        context: PROFILE_CONTEXT,
        type: PROFILE_TYPE,
        allow: '--U--'
      };
      const spy = spyOn(StoreUtils, 'objectExists').and.callFake((request: WriteRequest, store: Store, grants: PermissionGrant[]) => {
        expect(grants[0]).toEqual(grant);
        expect(store).toEqual(context.store);
        expect(request).toEqual(writeRequest);
        return false;
      });
      try {
        await controller.handleUpdateRequest(writeRequest, [grant]);
      } catch (err) {
        if (!(err instanceof HubError)) {
          fail(err.message);
        }
        expect(err.errorCode).toEqual(ErrorCode.NotFound);
      }

      try {
        await controller.handleDeleteRequest(writeRequest, [grant]);
      } catch (err) {
        if (!(err instanceof HubError)) {
          fail(err.message);
        }
        expect(err.errorCode).toEqual(ErrorCode.NotFound);
      }

      expect(spy).toHaveBeenCalled();
    });

    it('should create if the object already exists', async () => {
      const commit = TestCommit.create({
        sub: owner,
        kid: `${owner}#key-1`,
        context: PROFILE_CONTEXT,
        type: PROFILE_TYPE,
        commit_strategy: 'basic',
        operation: Operation.Update,
        object_id: getHex(),
      }, {
        title: 'Test'
      });
      const writeRequest = new WriteRequest({
        '@context': BaseRequest.context,
        '@type': 'WriteRequest',
        iss: sender,
        aud: hub,
        sub: owner,
        commit: {
          protected: commit.getProtectedString(),
          payload: commit.getPayloadString(),
          signature: 'bar'
        },
      });
      const spy = spyOn(StoreUtils, 'writeCommit').and.callFake((request: WriteRequest, store: Store) => {
        expect(store).toEqual(context.store);
        expect(request).toEqual(writeRequest);
        return new WriteResponse([request.commit.getHeaders().object_id]);
      });
      spyOn(StoreUtils, 'objectExists').and.returnValue(true);

      let result = await controller.handleUpdateRequest(writeRequest, []);
      expect(result.revisions[0]).toEqual(commit.getHeaders().object_id);

      result = await controller.handleDeleteRequest(writeRequest, []);
      expect(result.revisions[0]).toEqual(commit.getHeaders().object_id);
      expect(spy).toHaveBeenCalled();
    });
  });

  describe('handleQueryRequest', () => {
    const query = new ObjectQueryRequest({
      iss: sender,
      aud: hub,
      sub: owner,
      '@context': BaseRequest.context,
      '@type': 'ObjectQueryRequest',
      query: {
        interface: 'Profile',
        context: PROFILE_CONTEXT,
        type: PROFILE_TYPE,
      }
    });
    it('should return empty if no profile exists', async () => {
      const spy = spyOn(context.store, "queryObjects").and.returnValue({
        results: [],
        pagination: {
          skip_token: null,
        },
      });
      const results = await controller.handleQueryRequest(query, []);
      expect(results.objects.length).toEqual(0);
      expect(spy).toHaveBeenCalled();
    });
    it('should return a random profile if multiple exist', async () => {
      const profiles: ObjectContainer[] = [];
      const count = Math.round(Math.random() * 10) + 1;
      for(let i = 0; i < count; i++) {
        profiles.push({
        interface: 'Profile',
        context: PROFILE_CONTEXT,
        type: PROFILE_TYPE,
        id: getHex(),
        created_by: owner,
        created_at: new Date(Date.now()).toISOString(),
        sub: owner,
        commit_strategy: 'basic'
        });
      }
      const spy = spyOn(context.store, "queryObjects").and.returnValue({
        results: profiles,
        pagination: {
          skip_token: null,
        },
      });
      const results = await controller.handleQueryRequest(query, []);
      expect(results.objects.length).toEqual(1);
      expect(profiles.includes(results.objects[0])).toBeTruthy();
      expect(spy).toHaveBeenCalled();
    });
  })
});
