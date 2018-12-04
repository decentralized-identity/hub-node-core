// import { DidDocument, unitTestExports } from '@decentralized-identity/did-common-typescript';
// import Hub from '../lib/Hub';
// import TestContext from './mocks/TestContext';
// import {
//          JweToken,
//          JwsToken,
//          PublicKey,
//          RsaCryptoSuite,
//          PrivateKey,
//         CryptoFactory} from '@decentralized-identity/did-auth-jose';
// import { Context } from './models/BaseRequest.spec';

// describe('Hub', () => {

//   let testContext: TestContext;

//   const hubId = 'did:example:hub'
//   const hubKid = `${hubId}#key1`
//   let hubkey: PrivateKey;
//   let hubPublicKey: PublicKey;
//   let hubDID: DidDocument;
//   let hubKeys = {};
//   let testResolver: any;
//   const rsa = new RsaCryptoSuite();
//   const registry = new CryptoFactory([rsa]);

//   beforeAll(async (done) => {
//     testContext = new TestContext();
//     testContext.cryptoSuites = [rsa];

//     hubkey = await testContext.createPrivateKey(hubKid);
//     hubPublicKey = hubkey.getPublicKey();
//     hubDID = new DidDocument({
//       '@context': 'https://w3id.org/did/v1',
//       id: hubId,
//       publicKey: [{
//         id: hubKid,
//         type: 'RsaVerificationKey2018',
//         owner: hubId,
//         publicKeyJwk: hubPublicKey,
//       }],
//     });

//     hubKeys = {};
//     hubKeys[hubKid] = hubkey;
//     testContext.keys = hubKeys;

//     testResolver = new unitTestExports.TestResolver();
//     testResolver.setHandle(async (_: string) => { return hubDID; });
//     testContext.resolver = testResolver;
//     done();
//   });

//   const header = {
//     alg: 'RS256',
//     kid: hubKid,
//   };

//   const payload = {
//     iss: hubId,
//     aud: 'did:example:alice.id',
//     '@type': 'action/create',
//     payload: {},
//   };

//   function wrapRequest(key: PrivateKey, request: any): Buffer {
//     const jwsHeaders = {
//       alg: key.defaultSignAlgorithm
//     }
//     const jws = new JwsToken(request, registry);
//     const data = await jws.sign(hubkey, jwsHeader);
//     const jwe = new JweToken(data, registry);
//     const request = await jwe.encrypt(hubkey);
//   }

//   describe('handleRequest', () => {

//     it('should fail for unknown message type', async () => {
//       const hub = new Hub(testContext);

//           // create an access token, sign it, and add to jweToken Header.
//       const accessTokenPayload = {
//         sub: hubId,
//         iat: new Date(Date.now()),
//         exp: new Date(Date.now() + 2 * 60 * 1000),
//       };

//       const hubjws = new JwsToken(accessTokenPayload, registry);
//       const jwt = await hubjws.sign(hubkey);

//       const jwsHeader = {
//         'did-access-token': jwt,
//       };

//       const unknownMessage = {
//         iss: hubId,
//         aud: hubId,
//         sub: 'did:example:alice.id',
//         '@context': Context,
//         '@type': 'unknown',
//       };

//       const jws = new JwsToken(unknownMessage, registry);
//       const data = await jws.sign(hubkey, jwsHeader);
//       const jwe = new JweToken(data, registry);
//       const request = await jwe.encrypt(hubkey);

//       const httpresponse = await hub.handleRequest(request);
//       expect(httpresponse).toBeDefined();
//       expect(httpresponse.ok).toEqual(true);
//       expect(httpresponse.body).toBeDefined();

//     });
      
//   })

//   it('should send back an OK HttpResponse for requesting an access token.', async () => {

//     const hub = new Hub(testContext);

//     const jws = new JwsToken(payload, registry);
//     const data = await jws.sign(hubkey, header);
//     const jwe = new JweToken(data, registry);
//     const request = await jwe.encrypt(hubkey);

//     const httpresponse = await hub.handleRequest(request);
//     expect(httpresponse).toBeDefined();
//     expect(httpresponse.statusCode).toEqual(HttpStatus.OK);
//     expect(httpresponse.body).toBeDefined();
//   });

//   it('should fail validation and send back a httpStatus.Bad_Request', async () => { 

//     const did = new DidDocument({
//       '@context': 'https://w3id.org/did/v1',
//       id: hubId,
//       publicKey: [{
//         id: hubKid,
//         type: 'ExplicitlyUnknownKeyType2018',
//         owner: hubId,
//         publicKeyJwk: hubkey,
//       }],
//     });

//     testResolver.setHandle(async (_: string) => { return did; });
//     testContext.resolver = testResolver;

//     const hub = new Hub(testContext);

//     const payload = {
//       'test-data': Math.round(Math.random() * Number.MAX_SAFE_INTEGER),
//     };

//     const jws = new JwsToken(payload, registry);
//     const data = await jws.sign(hubkey, header);

//     const jwe = new JweToken(data, registry);
//     const request = await jwe.encrypt(hubkey);

//     const httpresponse = await hub.handleRequest(request);
//     expect(httpresponse).toBeDefined();
//     expect(httpresponse.statusCode).toEqual(HttpStatus.BAD_REQUEST);
//     expect(httpresponse.body).toBeDefined();
//   });
// });
