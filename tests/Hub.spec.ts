import { DidDocument, unitTestExports } from '@decentralized-identity/did-common-typescript';
import Hub from '../lib/Hub';
import TestContext from './mocks/TestContext';
import {
         JweToken,
         JwsToken,
         PublicKey,
         RsaCryptoSuite,
         PrivateKey,
        CryptoFactory} from '@decentralized-identity/did-auth-jose';
import { ErrorCode } from '../lib/models/HubError';
import CommitQueryRequest from '../lib/models/CommitQueryRequest';
import ObjectQueryRequest from '../lib/models/ObjectQueryRequest';
import TestCommit from './mocks/TestCommit';
import WriteRequest from '../lib/models/WriteRequest';
import BaseRequest from '../lib/models/BaseRequest';
import TestUtilities from './TestUtilities';
import WriteResponse from '../lib/models/WriteResponse';

describe('Hub', () => {

  let testContext: TestContext;

  let hubId = 'did:example:hub'
  let hubKid = `${hubId}#key1`
  let hubkey: PrivateKey;
  let hubPublicKey: PublicKey;
  let hubDID: DidDocument;
  let hubKeys: {[id: string]: PrivateKey}= {};
  const rsa = new RsaCryptoSuite();
  const registry = new CryptoFactory([rsa]);

  beforeEach(async () => {
    hubId = `did:example:${TestUtilities.randomString()}`;
    hubKid = `${hubId}#key1`
    testContext = new TestContext();
    testContext.cryptoSuites = [rsa];
    hubkey = await testContext.createPrivateKey(hubKid);
    hubPublicKey = hubkey.getPublicKey();
    hubKeys = {};
    hubKeys[hubKid] = hubkey;
    testContext.keys = hubKeys;
    hubDID = new DidDocument({
      '@context': 'https://w3id.org/did/v1',
      id: hubId,
      publicKey: [{
        id: hubKid,
        type: 'RsaVerificationKey2018',
        owner: hubId,
        publicKeyJwk: hubPublicKey,
      }],
    });
    const testResolver = new unitTestExports.TestResolver();
    testResolver.setHandle(async (_: string) => { return hubDID; });
    testContext.resolver = testResolver;
    TestUtilities.resetSignedCommitStatics();
  });

  const header = {
    alg: 'RS256',
    kid: hubKid,
  };

  async function wrapRequest(privateKey: PrivateKey, key: PublicKey, request: string | object, headers?: any): Promise<Buffer> {
    // create an access token, sign it, and add to jweToken Header.
    const accessTokenPayload = {
      sub: hubId,
      iat: new Date(Date.now()),
      exp: new Date(Date.now() + 2 * 60 * 1000),
    };
    const hubjws = new JwsToken(accessTokenPayload, registry);
    const jwt = await hubjws.sign(privateKey);
    const jwsHeaders = Object.assign({
      'did-access-token': jwt,
    }, headers);
    const jws = new JwsToken(request, registry);
    const data = await jws.sign(hubkey, jwsHeaders);
    const jwe = new JweToken(data, registry);
    return jwe.encrypt(key);
  }

  async function unwrapResponse(privateKey: PrivateKey, key: PublicKey, response: Buffer): Promise<any> {
    const responseString = response.toString('utf-8');
    const jwe = new JweToken(responseString, registry);
    const data = await jwe.decrypt(privateKey);
    const jws = new JwsToken(data, registry);
    const verifiedData = await jws.verifySignature(key);
    try {
      return JSON.parse(verifiedData);
    } catch (_) {
      return verifiedData;
    }
  }

  describe('handleRequest', () => {

    it('should fail for unknown message type', async () => {
      const hub = new Hub(testContext);

      const unknownMessage = {
        iss: hubId,
        aud: hubId,
        sub: 'did:example:alice.id',
        '@context': BaseRequest.context,
        '@type': 'unknown',
      };

      const request = await wrapRequest(hubkey, hubkey, unknownMessage);

      const httpresponse = await hub.handleRequest(request);
      expect(httpresponse).toBeDefined();
      expect(httpresponse.ok).toEqual(true);
      expect(httpresponse.body).toBeDefined();
      const response = await unwrapResponse(hubkey, hubkey, httpresponse.body);
      expect(response.error_code).toEqual(ErrorCode.BadRequest);
      expect(response.target).toEqual('@type');
    });

    it('should send back an OK HttpResponse for requesting an access token.', async () => {

      const hub = new Hub(testContext);

      const request = await wrapRequest(hubkey, hubkey, '', {'did-access-token': null});
      const httpresponse = await hub.handleRequest(request);
      expect(httpresponse).toBeDefined();
      expect(httpresponse.ok).toEqual(true);
      expect(httpresponse.body).toBeDefined();
      const response = await unwrapResponse(hubkey, hubkey, httpresponse.body);
      expect(response.split('.').length).toEqual(3); // compact JWS comes in the form header.content.signature
    });

    it('should fail validation and send back an authentication failure', async () => { 

      const did = new DidDocument({
        '@context': 'https://w3id.org/did/v1',
        id: hubId,
        publicKey: [{
          id: hubKid,
          type: 'ExplicitlyUnknownKeyType2018',
          owner: hubId,
          publicKeyJwk: hubkey,
        }],
      });

      const testResolver = new unitTestExports.TestResolver();
      testResolver.setHandle(async (_: string) => { return did; });
      testContext.resolver = testResolver;

      const hub = new Hub(testContext);

      const payload = {
        'test-data': Math.round(Math.random() * Number.MAX_SAFE_INTEGER),
      };

      const jws = new JwsToken(payload, registry);
      const data = await jws.sign(hubkey, header);

      const jwe = new JweToken(data, registry);
      const request = await jwe.encrypt(hubkey);

      const httpresponse = await hub.handleRequest(request);
      expect(httpresponse).toBeDefined();
      expect(httpresponse.ok).toEqual(false);
      expect(httpresponse.body).toBeDefined();
      const response = JSON.parse(httpresponse.body.toString('utf-8'));
      expect(response.error_code).toEqual(ErrorCode.AuthenticationFailed);
    });

    it('should dispatch CommitQueryRequests to the commitController', async() => {
      const hub = new Hub(testContext);
      const commitController = hub['_commitController'];

      const commitRequest = {
        iss: hubId,
        aud: hubId,
        sub: hubId,
        '@context': BaseRequest.context,
        '@type': 'CommitQueryRequest',
        query: {
          object_id: ['foobar'],
        },
      };
      const spy = spyOn(commitController, 'handle').and.callFake((request: CommitQueryRequest) => {
        expect(request.objectIds).toEqual(commitRequest.query.object_id);
      });
      const requestString = await wrapRequest(hubkey, hubkey, JSON.stringify(commitRequest));
      await hub.handleRequest(requestString);
      expect(spy).toHaveBeenCalled();
    });

    ['Collections', 'Permissions', 'Profile', 'Actions'].forEach((hubInterface) => {
      it(`should dispatch ObjectQueryRequest to ${hubInterface}Controller correctly`, async() => {
        const hub = new Hub(testContext);
        const controller = hub['_controllers'][hubInterface];

        const objectQueryRequest = {
          iss: hubId,
          aud: hubId,
          sub: hubId,
          '@context': BaseRequest.context,
          '@type': 'ObjectQueryRequest',
          query: {
            interface: hubInterface,
            context: 'example.com',
            type: 'test',
          },
        };

        const spy = spyOn(controller, 'handle').and.callFake((request: ObjectQueryRequest) => {
          expect(request.queryContext).toEqual(objectQueryRequest.query.context);
          expect(request.queryType).toEqual(objectQueryRequest.query.type);
        });
        const requestString = await wrapRequest(hubkey, hubkey, JSON.stringify(objectQueryRequest));
        await hub.handleRequest(requestString);
        expect(spy).toHaveBeenCalled();
      });

      it(`should dispatch WriteRequest to ${hubInterface}Controller correctly`, async() => {
        const hub = new Hub(testContext);
        const controller = hub['_controllers'][hubInterface];

        const commit = TestCommit.create({
          interface: hubInterface,
          sub: hubId,
          kid: hubKid,
          context: 'example.com',
          type: 'foobar',
        }, {
          'test': TestUtilities.randomString(),
        });

        const signedCommit = await TestUtilities.toSignedCommit(commit, hubkey);

        const writeRequest = {
          iss: hubId,
          aud: hubId,
          sub: hubId,
          '@context': BaseRequest.context,
          '@type': 'WriteRequest',
          commit: signedCommit.toJson(),
        };

        const value = TestUtilities.randomString();
        spyOn(controller, 'handle').and.returnValue(Promise.resolve(new WriteResponse([value])));
        const requestString = await wrapRequest(hubkey, hubkey, JSON.stringify(writeRequest));
        const response = await hub.handleRequest(requestString);
        const unwrapped = await unwrapResponse(hubkey, hubPublicKey, response.body);
        expect(unwrapped.revisions).toEqual([value]);
      });
    });

    it('should call getAuthorizedResponse', async() => {
      const hub = new Hub(testContext);
      const controller = hub['_controllers']['Actions'];
      const auth = hub['_authentication'];

      const commit = TestCommit.create({
        interface: 'Actions',
        sub: hubId,
        kid: hubKid,
        context: 'example.com',
        type: 'foobar',
      });

      const signedCommit = await TestUtilities.toSignedCommit(commit, hubkey);

      const writeRequest = {
        iss: hubId,
        aud: hubId,
        sub: hubId,
        '@context': BaseRequest.context,
        '@type': 'WriteRequest',
        commit: signedCommit.toJson(),
      };

      const testValue = 'foobar';
      const spy = spyOn(controller, 'handle').and.callFake((request: WriteRequest) => {
        expect(request.commit.getHeaders().context).toEqual(commit.getHeaders().context);
        expect(request.commit.getHeaders().type).toEqual(commit.getHeaders().type);
        return {
          toString(): string {
            return testValue;
          },
        };
      });
      const authSpy = spyOn(auth, 'getAuthenticatedResponse').and.callThrough();
      const requestString = await wrapRequest(hubkey, hubkey, JSON.stringify(writeRequest));
      const response = await hub.handleRequest(requestString);
      expect(spy).toHaveBeenCalled();
      expect(authSpy).toHaveBeenCalled();
      expect(response.ok).toBeTruthy();
      expect(await unwrapResponse(hubkey, hubkey, response.body)).toEqual(testValue);
    });

    it('should throw for incorrect interfaces in ObjectQueryRequests', async() => {
      const hub = new Hub(testContext);

      const objectQueryRequest = {
        iss: hubId,
        aud: hubId,
        sub: hubId,
        '@context': BaseRequest.context,
        '@type': 'ObjectQueryRequest',
        query: {
          interface: 'Unknown',
          context: 'example.com',
          type: 'test',
        },
      };

      const requestString = await wrapRequest(hubkey, hubkey, JSON.stringify(objectQueryRequest));
      const response = await hub.handleRequest(requestString);
      expect(response.ok).toBeTruthy();
      const error = await unwrapResponse(hubkey, hubkey, response.body);
      expect(error.error_code).toEqual(ErrorCode.BadRequest);
      expect(error.target).toEqual('query.interface');
    });

    it('should throw for incorrect interfaces in WriteRequests', async() => {
      const hub = new Hub(testContext);

      const commit = TestCommit.create({
        interface: 'Unknown',
        sub: hubId,
        kid: hubKid,
        context: 'example.com',
        type: 'foobar',
      });

      const objectQueryRequest = {
        iss: hubId,
        aud: hubId,
        sub: hubId,
        '@context': BaseRequest.context,
        '@type': 'WriteRequest',
        commit: {
          protected: commit.getProtectedString(),
          payload: commit.getPayloadString(),
          signature: 'foo',
        },
      };

      const requestString = await wrapRequest(hubkey, hubkey, JSON.stringify(objectQueryRequest));
      const response = await hub.handleRequest(requestString);
      expect(response.ok).toBeTruthy();
      const error = await unwrapResponse(hubkey, hubkey, response.body);
      expect(error.error_code).toEqual(ErrorCode.BadRequest);
      expect(error.target).toEqual('commit.protected.interface');
    });
  });
});
