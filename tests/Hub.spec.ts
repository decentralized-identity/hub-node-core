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
import { Context } from './models/BaseRequest.spec';
import { ErrorCode } from '../lib';

describe('Hub', () => {

  let testContext: TestContext;

  const hubId = 'did:example:hub'
  const hubKid = `${hubId}#key1`
  let hubkey: PrivateKey;
  let hubPublicKey: PublicKey;
  let hubDID: DidDocument;
  let hubKeys: {[id: string]: PrivateKey}= {};
  let testResolver: any;
  const rsa = new RsaCryptoSuite();
  const registry = new CryptoFactory([rsa]);

  beforeAll(async (done) => {
    testContext = new TestContext();
    testContext.cryptoSuites = [rsa];

    hubkey = await testContext.createPrivateKey(hubKid);
    hubPublicKey = hubkey.getPublicKey();
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

    hubKeys = {};
    hubKeys[hubKid] = hubkey;
    testContext.keys = hubKeys;

    testResolver = new unitTestExports.TestResolver();
    testResolver.setHandle(async (_: string) => { return hubDID; });
    testContext.resolver = testResolver;
    done();
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
        '@context': Context,
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
  })

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
    console.log(httpresponse.body.toString('utf-8'));
    const response = JSON.parse(httpresponse.body.toString('utf-8'));
    expect(response.error_code).toEqual(ErrorCode.AuthenticationFailed);
  });
});
