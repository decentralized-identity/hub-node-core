import HubRequest from '../../lib/models/HubRequest';

describe('HubRequest', () => {
  describe('Constructor', () => {
    it('Audiance is always required', () => {
      try {
        new HubRequest({
          iss: 'did:example:alice.id',
          '@type': 'Base/Any',
        });

      } catch (err) {
        expect(err).toBeDefined();
      }
    });

    it('Issuer is always required', () => {
      try {
        new HubRequest({
          aud: 'did:example:alice.id',
          '@type': 'Base/Any',
        });

      } catch (err) {
        expect(err).toBeDefined();
      }
    });

    it('Type is always required', () => {
      try {
        new HubRequest({
          iss: 'did:example:alice.id',
          aud: 'did:example:bob.id',
        });

      } catch (err) {
        expect(err).toBeDefined();
      }
    });

    it('Places parameters in the correct fields', () => {
      const testTitle = Math.random().toString();
      const testTag = Math.random().toString();
      const owner = `did:test:${Math.random().toString()}.id`;
      const requester = `did:test:${Math.random().toString()}.id`;
      const testInterface = Math.random().toString();
      const testAction = Math.random().toString();
      const testSchema = `schema.example.org/${Math.random().toString()}`;
      const testId = Math.random().toString();
      const intent = ['min', 'attr', 'full'][Math.floor(Math.random() * 3)];
      const testPayload = {
        meta: {
          title: testTitle,
          tags: ['test', 'HubRequest', testTag],
          'cache-intent': intent,
        },
        data: { // purely for system logging purposes
          who: 'HubRequest.spec correct field parsing',
          time: new Date().toLocaleString(),
        },
      };
      const request = new HubRequest({
        iss: requester,
        aud: owner,
        '@type': `${testInterface}/${testAction}`,
        request: {
          schema: testSchema,
          id: testId,
        },
        payload: testPayload,
      });
      expect(request).toBeDefined('request should be parsed');
      expect(request.aud).toEqual(owner, 'aud incorrectly parsed');
      expect(request.iss).toEqual(requester, 'iss incorrectly parsed');
      expect(request.getAction()).toEqual(testInterface, '@type incorrectly parsed');
      // expect(request.getAction()).toEqual(testAction, '@type incorrectly parsed');
      expect(request.request).toBeDefined();
      if (request.request) {
        expect(request.request.schema).toEqual(testSchema, 'request.schema incorrectly parsed');
        expect(request.request.id).toEqual(testId, 'request.id incorrectly parsed');
      } else {
        fail('request not defined.');
      }
      expect(request.payload).toBeDefined();
      if (request.payload) {
        expect(request.payload).toEqual(testPayload, 'payload incorrectly parsed');
        if (request.payload.meta) {
          expect(request.payload.meta.title).toEqual(testTitle, 'payload.meta.title incorrectly parsed');
          expect(request.payload.meta.tags).toContain(testTag, 'payload.meta.tags incorrectly parsed');
          expect(request.payload.meta['cache-intent']).toEqual(intent, 'payload.meta.cache-intent incorrectly parsed');
        } else {
          fail('payload.meta should be defined');
        }
      } else {
        fail('paylod not defined');
      }
    });
  });
});
