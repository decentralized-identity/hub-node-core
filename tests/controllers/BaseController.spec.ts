import HubRequest from '../../lib/models/HubRequest';
import HubResponse from '../../lib/models/HubResponse';
import HubError from '../../lib/models/HubError';
import TestController from '../mocks/TestController';

describe('BaseController', () => {
  const controller = new TestController();

  beforeEach(() => {
    controller.removeAllHandlers();
  });

  async function dispatchCheckFor(action: string, done: () => void) {
    const responseCode = Math.round(Math.random() * 500);
    const expectedRequest = new HubRequest({
      iss: 'did:example:alice.id',
      aud: 'did:example:alice.id',
      '@type': `Test/${action}`,
      request: {
        schema: 'null',
        id: '0',
      },
      payload: {
        data: {},
      },
    });
    controller.setHandler(action, async (request) => {
      expect(request).toBe(expectedRequest, 'Handler did not recieve the same request');
      const response = HubResponse.withError(new HubError('', responseCode));
      return response;
    });
    const response = await controller.handle(expectedRequest);
    expect(response.getResponseCode()).toBe(responseCode, 'Expected handler was not called');
    done();
  }

  it('should dispatch Add requests', async (done) => {
    await dispatchCheckFor('Add', done);
  });

  it('should dispatch Read requests', async (done) => {
    await dispatchCheckFor('Read', done);
  });

  it('should dispatch Update requests', async (done) => {
    await dispatchCheckFor('Update', done);
  });

  it('should dispatch Remove requests', async (done) => {
    await dispatchCheckFor('Remove', done);
  });

  it('should dispatch Execute requests', async (done) => {
    await dispatchCheckFor('Execute', done);
  });

  it('should return errors for unknown actions', async (done) => {
    const randomNumber = Math.round(Math.random() * 1000).toString();
    const request = new HubRequest({
      iss: 'did:example:alice.id',
      aud: 'did:example:alice.id',
      '@type': `Test/${randomNumber}`,
    });
    try {
      const response = await controller.handle(request);
      expect(response).toBeDefined();
      const body = response.getResponseBody();
      if (!body) {
        fail('Response did not contain an error message');
        return;
      }
      expect(body.error).toBeDefined();
      done();
    } catch (reject) {
      fail(reject);
      done();
    }
  });
});
