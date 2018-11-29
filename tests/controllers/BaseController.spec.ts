import base64url from 'base64url';
import HubError, { ErrorCode, DeveloperMessage } from '../../lib/models/HubError';
import TestController from '../mocks/TestController';
import WriteRequest from '../../lib/models/WriteRequest';
import { Operation } from '../../lib/models/Commit';
import ObjectQueryRequest from '../../lib/models/ObjectQueryRequest';
import BaseRequest from '../../lib/models/BaseRequest';

const context = 'https://schema.identity.foundation/0.1';

describe('BaseController', () => {
  const controller = new TestController();

  async function dispatchCheckFor(operation: string, handler: any, object_id?: string) {
    const message = Math.round(Math.random() * Number.MAX_SAFE_INTEGER).toString(16);
    const expectedRequest = new WriteRequest({
      iss: 'did:example:alice.id',
      aud: 'did:example:hub.id',
      sub: 'did:example:alice.id',
      '@context': context,
      '@type': 'WriteRequest',
      commit: {
        protected: base64url.encode(JSON.stringify({
          interface: 'test',
          context: 'example.com',
          type: 'test',
          operation,
          object_id,
          'committed_at': new Date(Date.now()).toISOString(),
          'commit_strategy': 'basic',
          sub: 'did:example:alice.id',
          kid: 'did:example:alice.id#key1',
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
      await controller.handle(expectedRequest);
    } catch (err) {
      if (!(err instanceof HubError)) {
        fail(err.message);
      }
      expect(err.developerMessage).toEqual(message);
    }
    expect(spy).toHaveBeenCalled();
  }

  it('should dispatch Create requests', async () => {
    await dispatchCheckFor(Operation.Create, 'handleCreateRequest');
  });

  it('should dispatch Read requests', async () => {
    const message = Math.round(Math.random() * Number.MAX_SAFE_INTEGER).toString(16);
    const queryRequest = new ObjectQueryRequest({
      '@context': 'https://schema.identity.foundation/0.1',
      '@type': 'ObjectQueryRequest',
      iss: 'did:example:alice.id',
      aud: 'did:example:hub.id',
      sub: 'did:example:alice.id',
      query: {
        interface: 'Base',
        context: 'example.com',
        type: 'test',
      }
    });
    const spy = spyOn(controller, 'handleQueryRequest').and.callFake(() => {
      throw new HubError({
        errorCode: ErrorCode.NotImplemented,
        developerMessage: message,
      });
    });
    try {
      await controller.handle(queryRequest);
    } catch (err) {
      if (!(err instanceof HubError)) {
        fail(err.message);
      }
      expect(err.developerMessage).toEqual(message);
    }
    expect(spy).toHaveBeenCalled();
  });

  it('should dispatch Update requests', async () => {
    await dispatchCheckFor(Operation.Update, 'handleUpdateRequest', Math.round(Math.random() * 255).toString(16));
  });

  it('should dispatch Delete requests', async () => {
    await dispatchCheckFor(Operation.Delete, 'handleDeleteRequest', Math.round(Math.random() * 255).toString(16));
  });

  it('should return errors for unknown operations', async () => {
    try {
      const expectedRequest = new WriteRequest({
        iss: 'did:example:alice.id',
        aud: 'did:example:hub.id',
        sub: 'did:example:alice.id',
        '@context': context,
        '@type': 'WriteRequest',
        commit: {
          protected: base64url.encode(JSON.stringify({
            interface: 'test',
            context: 'example.com',
            type: 'test',
            operation: 'TestOperation',
            'committed_at': new Date(Date.now()).toISOString(),
            'commit_strategy': 'basic',
            sub: 'did:example:alice.id',
            kid: 'did:example:alice.id#key1',
          })),
          payload: '',
          signature: '',
        },
      });
      await controller.handle(expectedRequest);
      fail('did not throw an error');
    } catch (err) {
      if (!(err instanceof HubError)) {
        fail(err.message);
      }
      const testError = err as HubError;
      expect(testError.errorCode).toEqual(ErrorCode.BadRequest);
      expect(testError.property).toEqual('commit.protected.operation');
      expect(testError.developerMessage).toEqual(DeveloperMessage.IncorrectParameter);
    }
  });

  it('should return errors for unknown types', async () => {
    try {
      const expectedRequest = new BaseRequest({
        iss: 'did:example:alice.id',
        aud: 'did:example:hub.id',
        sub: 'did:example:alice.id',
        '@context': context,
        '@type': 'UnknownRequestType',
      });
      expectedRequest['type'] = 'UnknownRequestType';
      await controller.handle(expectedRequest);
      fail('did not throw an error');
    } catch (err) {
      if (!(err instanceof HubError)) {
        fail(err.message);
      }
      const testError = err as HubError;
      expect(testError.errorCode).toEqual(ErrorCode.BadRequest);
      expect(testError.property).toEqual('@type');
      expect(testError.developerMessage).toEqual(DeveloperMessage.IncorrectParameter);
    }
  });

  it('should throw if the commit subject does not match the request subject', async() => {
    try {
      const badRequest = new WriteRequest({
        iss: 'did:example:alice.id',
        aud: 'did:example:hub.id',
        sub: 'did:example:alice.id',
        '@context': context,
        '@type': 'WriteRequest',
        commit: {
          protected: base64url.encode(JSON.stringify({
            interface: 'test',
            context: 'example.com',
            type: 'testype',
            operation: 'create',
            'committed_at': new Date(Date.now()).toISOString(),
            'commit_strategy': 'basic',
            sub: 'did:example:bob.id',
            kid: 'did:example:bob.id#key1',
          })),
          payload: '',
          signature: '',
        },
      });
      await controller.handle(badRequest);
      fail('did not throw an error');
    } catch (err) {
      if (!(err instanceof HubError)) {
        fail(err.message);
      }
      const testError = err as HubError;
      expect(testError.errorCode).toEqual(ErrorCode.BadRequest);
      expect(testError.property).toEqual('commit.protected.sub');
      expect(testError.developerMessage).toEqual(DeveloperMessage.IncorrectParameter);
    }
  });
});
