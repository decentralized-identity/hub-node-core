import TestCommit from '../mocks/TestCommit';
import TestContext from '../mocks/TestContext';
import TestAuthorization from '../mocks/TestAuthorization';
import ProfileController, { PROFILE_TYPE, PROFILE_CONTEXT } from '../../lib/controllers/ProfileController';
import WriteRequest from '../../lib/models/WriteRequest';
import { Context } from '../models/BaseRequest.spec';
import HubError, { ErrorCode } from '../../lib/models/HubError';
import { ObjectQueryRequest, Store } from '../../lib/interfaces/Store';
import StoreUtils from '../../lib/utilities/StoreUtils';
import ObjectContainer from '../../lib/interfaces/ObjectContainer';
import { Operation } from '../../lib/models/Commit';

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
        '@context': Context,
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
        '@context': Context,
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
        '@context': Context,
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
      const spy = spyOn(context.store, "queryObjects").and.callFake((request: ObjectQueryRequest) => {
        expect(request.owner).toEqual(owner);
        expect(request.filters).toBeDefined();
        if (!request.filters) {
          return;
        }
        expect(request.filters.length).toEqual(3);
        let countFound = 0;
        request.filters.forEach((filter) => {
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
        '@context': Context,
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
        '@context': Context,
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
});
