import HubError, { ErrorCode, DeveloperMessage } from '../../lib/models/HubError';
import TestController from '../mocks/TestController';
import WriteRequest from '../../lib/models/WriteRequest';
import Base64Url from '@decentralized-identity/did-auth-jose/lib/utilities/Base64Url';
import { Operation } from '../../lib/models/Commit';

const context = 'https://schema.identity.foundation/0.1';

describe('BaseController', () => {
  const controller = new TestController();

  async function dispatchCheckFor(operation: string, handler: any) {
    const message = Math.round(Math.random() * Number.MAX_SAFE_INTEGER).toString(16);
    const expectedRequest = new WriteRequest({
      iss: 'did:example:alice.id',
      aud: 'did:example:hub.id',
      sub: 'did:example:alice.id',
      '@context': context,
      '@type': 'WriteRequest',
      commit: {
        protected: Base64Url.encode(JSON.stringify({
          operation,
        })),
        payload: '',
        signature: '',
      },
    });
    const spy = spyOn(controller, handler).and.callFake(() => {
      throw new HubError({
        errorCode: ErrorCode.NotImplemented,
        developerMessage: message,
      });
    });
    try {
      const response = await controller.handle(expectedRequest);
    } catch (err) {
      if (!(err instanceof HubError)) {
        fail(err);
      }
      expect(err.developerMessage).toEqual(message);
    }
    expect(spy).toHaveBeenCalled();
  }

  it('should dispatch Create requests', async () => {
    await dispatchCheckFor(Operation.Create, 'handleCreateRequest');
  });

  // it('should dispatch Read requests', async () => {
  //   await dispatchCheckFor('Read', );
  // });

  it('should dispatch Update requests', async () => {
    await dispatchCheckFor(Operation.Update, 'handleUpdateRequest');
  });

  it('should dispatch Delete requests', async () => {
    await dispatchCheckFor(Operation.Delete, 'handleDeleteRequest');
  });

  it('should return errors for unknown actions', async () => {
    const expectedRequest = new WriteRequest({
      iss: 'did:example:alice.id',
      aud: 'did:example:hub.id',
      sub: 'did:example:alice.id',
      '@context': context,
      '@type': 'WriteRequest',
      commit: {
        protected: Base64Url.encode(JSON.stringify({
          operation: 'TestOperation',
        })),
        payload: '',
        signature: '',
      },
    });
    try {
      await controller.handle(expectedRequest);
      fail('did not throw an error');
    } catch (err) {
      if (!(err instanceof HubError)) {
        fail(err);
      }
      const testError = err as HubError;
      expect(testError.errorCode).toEqual(ErrorCode.BadRequest);
      expect(testError.property).toEqual('commit.protected.operation');
      expect(testError.developerMessage).toEqual(DeveloperMessage.IncorrectParameter);
    }
  });
});
