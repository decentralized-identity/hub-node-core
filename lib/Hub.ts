import * as HttpStatus from 'http-status';
import Context from './interfaces/Context';
import HttpHubResponse from './models/HttpHubResponse';
import HubRequest from './models/HubRequest';
import HubResponse from './models/HubResponse';

// Controller classes.
import BaseController from './controllers/BaseController';
import ActionsController from './controllers/ActionsController';
import CollectionsController from './controllers/CollectionsController';
import PermissionsController from './controllers/PermissionsController';
import ProfileController from './controllers/ProfileController';

const jose = require('node-jose');

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
    let plainTextRequestString = null;

    // Try decrypt the payload and validate signature,
    // Respond with bad request if unable to identify the requester.
    try {
      // Load the key specified by 'kid' in the JWE header.
      const requestString = request.toString();
      const keyId = Hub.getKeyIdInJweOrJws(requestString);
      hubKey = this.context.keys[keyId];

      // Get the JWS payload and access token by decrypting the JWE blob,
      const keyPair = await jose.JWK.asKey(hubKey); // NOTE: Must use library object for decryption.
      const decryptedData = await jose.JWE.createDecrypt(keyPair).decrypt(requestString);
      const jwsString = decryptedData.plaintext.toString();
      accessTokenString = Hub.getJweOrJwsHeader(jwsString)['did-access-token'];

      // Obtain the requester's public key.
      const requesterPublicKeyId = Hub.getKeyIdInJweOrJws(jwsString);
      requesterPublicKey = Hub.lookUpPublicKey(requesterPublicKeyId);
      requesterPublicKey = hubKey; // TODO: Remove once look up is implemented, for now using a hardcoded hub key.

      // Parse requester DID from the requester's fully-qualified public key ID.
      requesterDid = Hub.parseDid(requesterPublicKeyId);

      // Verify the signature of the sender.
      plainTextRequestString = await Hub.verifySignature(jwsString, requesterPublicKey);
    } catch (error) {
      // TODO: Proper error logging with logger, for now loggint to console.
      console.log(error);
      return { statusCode: HttpStatus.BAD_REQUEST, body: Buffer.from('') };
    }

    // NOTE: Requester is identified if code reaches here.
    try {
      // Verify access token.
      const tokenVerified = await this.verifyAccessToken(accessTokenString, requesterDid);

      // If Hub access token is not found in the request or is invalid,
      // respond with a new Hub access token.
      if (!tokenVerified) {
        // Create a new access token.
        const validDurationInMinutes = 5;
        const accessToken = {
          sub: requesterDid,
          iat: new Date(Date.now()),
          exp: new Date(Date.now() + validDurationInMinutes * 600000),
          nonce: jose.util.randomBytes(64).toString('base64'),
        };

        // Sign then encrypt the new access token.
        const responseBuffer = await Hub.signThenEncrypt(accessToken, hubKey, requesterPublicKey);

        return {
          statusCode: HttpStatus.OK,
          body: responseBuffer,
        };
      }

      // If we get here, it means the Hub access token recieved is valid, proceed with handling the request.
      const requestJson = JSON.parse(plainTextRequestString);
      const hubRequest = new HubRequest(requestJson);
      const controller = this._controllers[hubRequest.getInterface()];
      const hubResponse = await controller.handle(hubRequest);

      // Sign then encrypt the response.
      const hubResponseBody = hubResponse.getResponseBody();
      const responseBuffer = await Hub.signThenEncrypt(hubResponseBody, hubKey, requesterPublicKey);

      return { statusCode: HttpStatus.OK, body: responseBuffer };
    } catch (error) {
      // TODO: Consider defining Hub response code as part of the body.
      const hubResponse = HubResponse.withError(error);
      const hubResponseBody = hubResponse.getResponseBody();

      // Sign then encrypt the error response.
      const responseBuffer = await Hub.signThenEncrypt(hubResponseBody, hubKey, requesterPublicKey);

      return {
        statusCode: HttpStatus.OK,
        body: responseBuffer,
      };
    }
  }

  /**
   * // TODO: Provide implementation.
   * Gets the public key in JWK format given the fully-qualified key ID.
   *
   * @param keyId A fully-qualified key ID. e.g.
   */
  private static lookUpPublicKey(keyId: string): object {
    console.log(`Public key look-up for ${keyId} is not implemented.`);
    return {};
  }

  private static async verifySignature(jwsString: string, jwk: object): Promise<string> {
    const key = await jose.JWK.asKey(jwk);
    const verifiedData = await jose.JWS.createVerify(key).verify(jwsString);

    return verifiedData.payload.toString();
  }

  private async verifyAccessToken(signedJwtString: string, requester: string): Promise<boolean> {
    if (!signedJwtString || !requester) {
      return false;
    }

    try {
      // TODO: Consider optimizing keys dictionary to have jose.JWK objects instead of JSON objects.
      // Fetch the key specified by kid in the JWS header.
      const keyId = Hub.getKeyIdInJweOrJws(signedJwtString);
      const hubKey = this.context.keys[keyId];
      const keyPair = await jose.JWK.asKey(hubKey);

      // Verify that the token was created by this Hub (signature verification).
      const verifiedData = await jose.JWS.createVerify(keyPair).verify(signedJwtString);

      // Verify that the token was issued to the same person making the current request.
      const token = JSON.parse(verifiedData.payload);
      if (token.sub !== requester) {
        return false;
      }

      // Verify that the token is not expired.
      const now = new Date(Date.now());
      const expiry = new Date(token.exp);
      if (now > expiry) {
        return false;
      }

      return true;
    } catch (error) {
      return false;
    }
  }

  private static async signThenEncrypt(content: object, signingKey: object, encryptingKey: object): Promise<Buffer> {
    const jwsCompactString = await Hub.sign(content, signingKey);
    const signedThenEncryptedContent = await Hub.encrypt(jwsCompactString, encryptingKey);

    return signedThenEncryptedContent;
  }

  private static async encrypt(content: string, jwk: object): Promise<Buffer> {
    const jweJson = await jose.JWE.createEncrypt({ contentAlg: 'A128GCM', format: 'compact' }, jwk)
      .update(Buffer.from(content))
      .final();

    return Buffer.from(jweJson);
  }

  /**
   * Sign the given content using the given private key in JWK format.
   * @returns Signed payload in compact JWS format.
   */
  private static async sign(content: object, jwk: object): Promise<string> {
    const contentBuffer = Buffer.from(JSON.stringify(content));
    const contentJwsString = await jose.JWS.createSign({ format: 'compact' }, jwk).update(contentBuffer).final();

    return contentJwsString;
  }

  private static getKeyIdInJweOrJws(jweOrJwsCompactString: string) {
    const header = this.getJweOrJwsHeader(jweOrJwsCompactString);
    return header.kid;
  }

  private static getJweOrJwsHeader(jweOrJwsCompactString: string): any {
    const headerLength = jweOrJwsCompactString.indexOf('.');
    const headerBase64 = jweOrJwsCompactString.substr(0, headerLength);

    return Hub.base64ToJson(headerBase64);
  }

  private static base64ToJson(base64String: string): any {
    const jsonString = new Buffer(base64String, 'base64').toString();
    return JSON.parse(jsonString);
  }

  private static parseDid(keyId: string): string {
    const didLength = keyId.indexOf('#');
    const did = keyId.substr(0, didLength);

    return did;
  }
}
