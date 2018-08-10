import * as HttpStatus from 'http-status';
import Context from './interfaces/Context';
import Crypto from './utils/Crypto';
import DidDocument from './utils/DidDocument';
import DidResolver from './utils/DidResolver';
import HttpHubResponse from './models/HttpHubResponse';
import HubError from './models/HubError';
import HubRequest from './models/HubRequest';
import HubResponse from './models/HubResponse';
import Jose from './utils/Jose';

// Controller classes.
import BaseController from './controllers/BaseController';
import ActionsController from './controllers/ActionsController';
import CollectionsController from './controllers/CollectionsController';
import PermissionsController from './controllers/PermissionsController';
import ProfileController from './controllers/ProfileController';

/**
 * Core class that handles Hub requests.
 */
export default class Hub {
  /**
   * Map of controllers that can be selected based on the interface name.
   */
  private _controllers: { [name: string]: BaseController };

  /**
   * Hub constructor.
   *
   * @param context Components for initializing the Hub.
   */
  public constructor(private context: Context) {
    // TODO: verify keys passed in context is in valid JWK format.

    this._controllers = {
      collections: new CollectionsController(this.context),
      actions: new ActionsController(this.context),
      permissions: new PermissionsController(this.context),
      profile: new ProfileController(this.context),
    };
  }

  /**
   * Handles the incoming request.
   * TODO: discuss consequences of exposing the response status code in plain-text (e.g. 401)
   *
   * @param request The raw request buffer.
   */
  public async handleRequest(request: Buffer): Promise<HttpHubResponse> {
    let requesterPublicKey = null;
    let requesterDid = null;
    let hubKey = null;
    let accessTokenString = null;
    let responseJwsHeader = null;
    let plainTextRequestString = null;

    // Try decrypt the payload and validate signature,
    // Respond with bad request if unable to identify the requester.
    try {
      // Load the key specified by 'kid' in the JWE header.
      const requestString = request.toString();
      const keyId = Jose.getKeyIdInJweOrJws(requestString);
      if (!keyId) console.log('Request must provide a key ID.');

      hubKey = this.context.keys[keyId];
      if (!hubKey) console.log('Cannot find key with ID: ' + keyId);

      // Get the JWS payload and access token by decrypting the JWE blob,
      const jwsString = await Crypto.decrypt(requestString, hubKey);
      const jwsHeader = Jose.getJweOrJwsHeader(jwsString);
      accessTokenString = jwsHeader['did-access-token'];

      // Record the requester nonce to be used in response.
      const requesterNonce = jwsHeader['did-requester-nonce'];
      responseJwsHeader = { 'did-requester-nonce': requesterNonce };

      // Obtain the requester's public key.
      const requesterPublicKeyId = Jose.getKeyIdInJweOrJws(jwsString);
      requesterPublicKey = DidResolver.lookUpPublicKey(requesterPublicKeyId);
      requesterPublicKey = hubKey; // TODO: Remove once look up is implemented, for now using a hardcoded hub key.

      // Parse requester DID from the requester's fully-qualified public key ID.
      requesterDid = DidDocument.getDidFromKeyId(requesterPublicKeyId);

      // Verify the signature of the sender.
      plainTextRequestString = await Crypto.verifySignature(jwsString, requesterPublicKey);
    } catch (error) {
      // TODO: Proper error logging with logger, for now loggint to console.
      console.log(error);
      return { statusCode: HttpStatus.BAD_REQUEST, body: Buffer.from('') };
    }

    // NOTE: Requester is identified if code reaches here.
    try {
      // If access token is not given, this is an "access request", issue a new token.
      if (!accessTokenString) {
        // Create a new access token.
        const validDurationInMinutes = 5;
        const accessToken = await Crypto.createAccessToken(hubKey, requesterDid, validDurationInMinutes);

        // Sign then encrypt the new access token.
        const responseBuffer = await Crypto.signThenEncrypt(responseJwsHeader, accessToken, hubKey, requesterPublicKey);

        return {
          statusCode: HttpStatus.OK,
          body: responseBuffer,
        };
      }

      // Token is given if code reaches here, verify it.

      // Get the key used to sign the access token specified in the 'kid' header parameters in the JWT header.
      const keyId = Jose.getKeyIdInJweOrJws(accessTokenString);
      const key = this.context.keys[keyId];
      const tokenVerified = await Crypto.verifyAccessToken(key, accessTokenString, requesterDid);

      // If Hub access token invalid.
      if (!tokenVerified) {
        throw new HubError('Access token rejected.');
      }

      // If we get here, it means the Hub access token recieved is valid, proceed with handling the request.
      const requestJson = JSON.parse(plainTextRequestString);
      const hubRequest = new HubRequest(requestJson);
      const controller = this._controllers[hubRequest.getInterface()];
      const hubResponse = await controller.handle(hubRequest);

      hubResponse.setInterfaceName(hubRequest.getInterface());

      // Sign then encrypt the response.
      const hubResponseBody = hubResponse.getResponseBody();
      const responseBuffer = await Crypto.signThenEncrypt(responseJwsHeader, hubResponseBody, hubKey, requesterPublicKey);

      return { statusCode: HttpStatus.OK, body: responseBuffer };
    } catch (error) {
      // TODO: Consider defining Hub response code as part of the body.
      const hubResponse = HubResponse.withError(error);
      const hubResponseBody = hubResponse.getResponseBody();

      // Sign then encrypt the error response.
      const responseBuffer = await Crypto.signThenEncrypt(responseJwsHeader, hubResponseBody, hubKey, requesterPublicKey);

      return {
        statusCode: HttpStatus.OK,
        body: responseBuffer,
      };
    }
  }
}
