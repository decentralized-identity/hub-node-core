import HubRequest from '../../lib/models/HubRequest';
import HubResponse from '../../lib/models/HubResponse';
import HubError from '../../lib/models/HubError';
import TestController from '../mocks/TestController';

function randomAction(): string {
  const actions = ['Add', 'Read', 'Update', 'Remove', 'Execute'];
  return actions[Math.round(Math.random() * actions.length)];
}

describe('Base Controller', () => {
  const controller = new TestController();

  beforeEach(() => {
    controller.reset();
  });

  it('Should dispatch handle requests', async (done) => {
    const action = randomAction();
    const responseCode = Math.round(Math.random() * 500);
    const expectedRequest = new HubRequest({
      iss: 'did:example:alice.id',
      aud: 'did:example:alice.id',
      '@type': `Test/${action}`,
    });
    controller.set(action, (request, resolve, _) => {
      expect(request).toBe(expectedRequest, 'Handler did not recieve the same request');
      const response = HubResponse.withError(new HubError('', responseCode));
      resolve(response);
    });
    const response = await controller.handle(expectedRequest);
    expect(response.getResponseCode()).toBe(responseCode, 'Expected handler was not called');
    done();
  });

  function payloadIsRequiredFor(type: string, done: () => void) {
    controller.set(type, (_, resolve, __) => {
      // the request should not reach here.
      fail('BaseController forwarded request requiring a payload');
      resolve(HubResponse.withError(new HubError('Test failed', 418)));
    });

    try {
      new HubRequest({
        iss: 'did:example:alice.id',
        aud: 'did:example:alice.id',
        '@type': `Test/${type}`,
      });
    } catch (err) {
      expect(err).toBeDefined();
      done();
    }
  }

  it('Should require payloads for add requests', (done) => {
    payloadIsRequiredFor('Add', done);
  })

  it('Should require payloads for update requests', (done) => {
    payloadIsRequiredFor('Update', done);
  })

  it('Should return errors for unknown actions', (done) => {
    const randomNumber = Math.round(Math.random() * 1000).toString();
    const request = new HubRequest({
      iss: 'did:example:alice.id',
      aud: 'did:example:alice.id',
      '@type': `Test/${randomNumber}`,
    });
    controller.handle(request).then((response) => {
      expect(response).toBeDefined();
      expect(response.getResponseBody()).toBeDefined();
      const body = response.getResponseBody();
      if (body) {
        expect(body.error).toBeDefined();
      } else {
        fail('Response did not contain an error message');
      }
      done();
    }).catch((reject) => {
      fail(reject);
      done();
    });
  })

})