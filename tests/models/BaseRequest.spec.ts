import { HubErrorCode } from '@decentralized-identity/hub-common-js';
import BaseRequest from "../../lib/models/BaseRequest";
import TestRequest from "../mocks/TestRequest";
import TestUtilities from "../TestUtilities";
import HubError, { DeveloperMessage } from "../../lib/models/HubError";

describe('BaseRequest', () => {
  describe('constructor', () => {
    function requestShouldError(json: string | any) {
      try {
        new TestRequest(json);
        fail('BaseRequest was created without error.');
      } catch (err) {
        expect(err).toBeDefined();
      }
    }

    it('should require an issuer field', () => {
      requestShouldError({
        '@context': BaseRequest.context,
        '@type': 'TestType',
        aud: 'did:example:hub.id',
        sub: 'did:example:alice.id',
      });
    });

    it('should require an Audience field', () => {
      requestShouldError({
        '@context': BaseRequest.context,
        '@type': 'TestType',
        iss: 'did:example:alice.id',
        sub: 'did:example:alice.id',
      });
    });

    it('should require a subject field', () => {
      requestShouldError({
        '@context': BaseRequest.context,
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
        '@context': 'example.com/NotTheBaseRequest.contextYouAreLookingFor',
        '@type': 'TestType',
        iss: 'did:example:alice.id',
        aud: 'did:example:hub.id',
        sub: 'did:example:alice.id',
      });
    });

    it('should require a @type field', () => {
      requestShouldError({
        '@context': BaseRequest.context,
        iss: 'did:example:alice.id',
        aud: 'did:example:bob.id',
      });
    });

    it('should require @type field to be a string', () => {
      requestShouldError({
        '@context': BaseRequest.context,
        '@type': true,
        iss: 'did:example:alice.id',
        aud: 'did:example:hub.id',
        sub: 'did:example:alice.id',
      });
    });

    it('should create valid requests', () => {
      const sender = 'did:example:alice.id';
      const hub = 'did:example:hub.id';
      const request = new TestRequest({
        '@context': BaseRequest.context,
        '@type': 'TestType',
        iss: sender,
        aud: hub,
        sub: sender,
      });
      expect(request.iss).toEqual(sender);
      expect(request.aud).toEqual(hub);
      expect(request.sub).toEqual(sender);
    });
  });

  describe('getType', () => {
    it('should return the type of the request', () => {
      const type = Math.round(Math.random() * Number.MAX_SAFE_INTEGER).toString(16);
      const request = new TestRequest({
        '@context': BaseRequest.context,
        '@type': type,
        iss: 'did:example:alice.id',
        aud: 'did:example:hub.id',
        sub: 'did:example:alice.id',
      });
      expect(request.getType()).toEqual(type);
    });
  });

  describe('getTypeFromJson', () => {
    it('should parse a JSON string correctly', () => {
      const testType = TestUtilities.randomString();
      const test = `{
        "@type": "${testType}"
      }`;
      expect(BaseRequest.getTypeFromJson(test)).toEqual(testType);
    });

    it('should throw if @type is not a string', () => {
      const test = {
        '@type': true,
      };
      try {
        BaseRequest.getTypeFromJson(test);
        fail('should throw');
      } catch (err) {
        if (!(err instanceof HubError)) {
          fail(err.message);
        }
        expect(err.errorCode).toEqual(HubErrorCode.BadRequest);
        expect(err.property).toEqual('@type');
        expect(err.developerMessage).toEqual(DeveloperMessage.IncorrectParameter);
      }
    })
  })
});
