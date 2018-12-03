import TestCommit from '../mocks/TestCommit';
import TestContext from '../mocks/TestContext';
import TestAuthorization from '../mocks/TestAuthorization';
import ProfileController, { PROFILE_TYPE, PROFILE_CONTEXT } from '../../lib/controllers/ProfileController';
import WriteRequest from '../../lib/models/WriteRequest';
import { Context } from '../models/BaseRequest.spec';
import HubError, { ErrorCode } from '../../lib/models/HubError';

function getHex(): string {
  return Math.round(Math.random() * Number.MAX_SAFE_INTEGER).toString(16);
}

describe('ProfileController', () => {
  const context = new TestContext();
  const auth = new TestAuthorization();
  const controller = new ProfileController(context, auth);

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
      controller.handleCreateRequest(request, []);
    });
  })
});
