import HubRequest from '../../lib/models/HubRequest';

describe('HubRequest', () => {
  describe('constructor', () => {
    it('should require an Audience field', () => {
      try {
        new HubRequest({
          iss: 'did:example:alice.id',
          '@type': 'Base/Any',
        });
        fail('Hub Request was created.');
      } catch (err) {
        expect(err).toBeDefined();
      }
    });

    it('should require an issuer field', () => {
      try {
        new HubRequest({
          aud: 'did:example:alice.id',
          '@type': 'Base/Any',
        });
        fail('Hub Request was created.');
      } catch (err) {
        expect(err).toBeDefined();
      }
    });

    it('should require a @type field', () => {
      try {
        new HubRequest({
          iss: 'did:example:alice.id',
          aud: 'did:example:bob.id',
        });
        fail('Hub Request was created.');
      } catch (err) {
        expect(err).toBeDefined();
      }
    });

    it('should places parameters in the correct fields', () => {
      const testTitle = Math.random().toString();
      const testTag = Math.random().toString();
      const testOwner = `did:test:${Math.random().toString()}.id`;
      const testRequester = `did:test:${Math.random().toString()}.id`;
      const testInterface = Math.random().toString();
      const testAction = Math.random().toString();
      const testSchema = `schema.example.org/${Math.random().toString()}`;
      const testId = Math.random().toString();
      const testIntent = ['min', 'attr', 'full'][Math.floor(Math.random() * 3)];
      const testPayload = {
        meta: {
          title: testTitle,
          tags: ['test', 'HubRequest', testTag],
          'cache-intent': testIntent,
        },
        data: { // purely for system logging purposes
          who: 'HubRequest.spec correct field parsing',
          time: new Date().toLocaleString(),
        },
      };
      const request = new HubRequest({
        iss: testRequester,
        aud: testOwner,
        '@type': `${testInterface}/${testAction}`,
        request: {
          schema: testSchema,
          id: testId,
        },
        payload: testPayload,
      });
      if (!request) {
        fail('request not defined.');
        return;
      }
      expect(request.aud).toEqual(testOwner, 'aud incorrectly parsed');
      expect(request.iss).toEqual(testRequester, 'iss incorrectly parsed');
      expect(request.getInterface()).toEqual(testInterface, '@type incorrectly parsed');
      expect(request.getAction()).toEqual(testAction, '@type incorrectly parsed');
      if (!(request.request)) {
        fail('request not defined.');
        return;
      }
      expect(request.request.schema).toEqual(testSchema, 'request.schema incorrectly parsed');
      expect(request.request.id).toEqual(testId, 'request.id incorrectly parsed');
      if (!request.payload) {
        fail('paylod not defined');
        return;
      }
      expect(request.payload).toEqual(testPayload, 'payload incorrectly parsed');
      if (!request.payload.meta) {
        fail('payload.meta should be defined');
        return;
      }
      expect(request.payload.meta.title).toEqual(testTitle, 'payload.meta.title incorrectly parsed');
      expect(request.payload.meta.tags).toContain(testTag, 'payload.meta.tags incorrectly parsed');
      expect(request.payload.meta['cache-intent']).toEqual(testIntent, 'payload.meta.cache-intent incorrectly parsed');
    });

    function payloadIsRequiredFor(type: string, done: () => void) {
      try {
        new HubRequest({
          iss: 'did:example:alice.id',
          aud: 'did:example:alice.id',
          '@type': `Test/${type}`,
        });
        fail('Hub Request was created without a payload');
      } catch (err) {
        expect(err).toBeDefined();
        done();
      }
    }

    it('should require payloads for add requests', (done) => {
      payloadIsRequiredFor('Add', done);
    });

    it('should require payloads for update requests', (done) => {
      payloadIsRequiredFor('Update', done);
    });
  });
});
