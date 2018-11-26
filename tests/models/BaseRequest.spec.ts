import BaseRequest from '../../lib/models/BaseRequest';

const context = 'https://schema.identity.foundation/0.1';

describe('BaseRequest', () => {
  describe('constructor', () => {
    function requestShouldError(json: string | any) {
      try {
        new BaseRequest(json);
        fail('BaseRequest was created without error.');
      } catch (err) {
        expect(err).toBeDefined();
      }
    }

    it('should require an issuer field', () => {
      requestShouldError({
        '@context': context,
        '@type': 'TestType',
        aud: 'did:example:hub.id',
        sub: 'did:example:alice.id',
      });
    });

    it('should require an Audience field', () => {
      requestShouldError({
        '@context': context,
        '@type': 'TestType',
        iss: 'did:example:alice.id',
        sub: 'did:example:alice.id',
      });
    });

    it('should require a subject field', () => {
      requestShouldError({
        '@context': context,
        '@type': 'TestType',
        iss: 'did:example:alice.id',
        aud: 'did:example:hub.id',
      });
    });

    it('should require a @context field', () => {
      requestShouldError({
        '@type': 'TestType',
        iss: 'did:example:alice.id',
        aud: 'did:example:hub.id',
        sub: 'did:example:alice.id',
      });
    });

    it('should require @context field to match context url', () => {
      requestShouldError({
        '@context': 'example.com/NotTheContextYouAreLookingFor',
        '@type': 'TestType',
        iss: 'did:example:alice.id',
        aud: 'did:example:hub.id',
        sub: 'did:example:alice.id',
      });
    });

    it('should require a @type field', () => {
      requestShouldError({
        '@context': context,
        iss: 'did:example:alice.id',
        aud: 'did:example:bob.id',
      });
    });

    it('should require @type field to be a string', () => {
      requestShouldError({
        '@context': context,
        '@type': true,
        iss: 'did:example:alice.id',
        aud: 'did:example:hub.id',
        sub: 'did:example:alice.id',
      });
    });

    it('should create valid requests', () => {
      const sender = 'did:example:alice.id';
      const hub = 'did:example:hub.id';
      const request = new BaseRequest({
        '@context': context,
        '@type': 'TestType',
        iss: sender,
        aud: hub,
        sub: sender,
      });
      expect(request.aud).toEqual(sender);
      expect(request.iss).toEqual(sender);
      expect(request.aud).toEqual(hub);
    });
  });

  describe('getType', () => {
    it('should return the type of the request', () => {
      const type = Math.round(Math.random() * Number.MAX_SAFE_INTEGER).toString(16);
      const request = new BaseRequest({
        '@context': context,
        '@type': type,
        iss: 'did:example:alice.id',
        aud: 'did:example:hub.id',
        sub: 'did:example:alice.id',
      });
      expect(request.getType()).toEqual(type);
    });
  });
});
