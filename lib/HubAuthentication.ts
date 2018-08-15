import HubError from './models/HubError';
import Jose from './Utilities/Jose';
import Rsa from './crypto/Rsa';
import * as crypto from 'crypto';

// TODO: Rewrite sign() to allow additional cryptographic algorithms to be added easily then remove dependency on 'node-jose'.
const jose = require('node-jose');

/**
 * Definition for a delegate that can verfiy signed data.
 */
type VerifySignatureDelegate = (signedContent: string, signature: string, jwk: object) => boolean;

/**
 * Class for performing various Hub authentication operations.
 */
export default class HubAuthentication {

  /**
   * Sign the given content using the given private key in JWK format.
   *
   * @param jwsHeaderParameters Header parameters in addition to 'alg' and 'kid' to be included in the JWS.
   * @returns Signed payload in compact JWS format.
   */
  public static async sign(jwsHeaderParameters: { [name: string]: string }, content: object | string, jwk: object): Promise<string> {
    let contentBuffer;
    if (typeof content === 'string') {
      contentBuffer = Buffer.from(content);
    } else { // Else content is a JSON object.
      contentBuffer = Buffer.from(JSON.stringify(content));
    }

    const contentJwsString = await jose.JWS.createSign({ format: 'compact', fields: jwsHeaderParameters }, jwk).update(contentBuffer).final();

    return contentJwsString;
  }

  /**
   * Verifies the given JWS compact serialized string using the given key in JWK object format.
   *
   * @returns The payload if signature is verified. Throws exception otherwise.
   */
  public static verifySignature(jwsString: string, jwk: object): string {
    const algorithm = Jose.getJweOrJwsHeader(jwsString).alg.toUpperCase();
    const signedContent = Jose.getJwsSignedContent(jwsString);
    const signature = Jose.getJwsSignature(jwsString);

    // Get the correct signature verification function based on the given algorithm.
    let verifySignature: VerifySignatureDelegate;
    switch (algorithm) {
      case 'RS256':
        verifySignature = Rsa.verifySignatureRS256;
        break;
      case 'RS512':
        verifySignature = Rsa.verifySignatureRS512;
        break;
      default:
        throw new HubError(`Unsupported signing alogrithm: ${algorithm}.`, 400);
    }

    const passedSignatureValidation = verifySignature(signedContent, signature, jwk);

    if (!passedSignatureValidation) {
      throw new HubError('Failed signature validation.', 400);
    }

    const verifiedData = Jose.getJwsPayload(jwsString);
    return verifiedData;
  }

  /**
   * Creates an access token in JWT compact serialized formation.
   *
   * @param privateKey Private key in JWK JSON object format to be used to sign the generated JWT.
   * @param requesterDid The DID of the requester the access token is generated for.
   * @param validDurationInMinutes The valid duration in number of minutes.
   * @returns Signed JWT in compact serialized format.
   */
  public static async createAccessToken(privateKey: object, requesterDid: string, validDurationInMinutes: number): Promise<string> {
    const accessTokenPayload = {
      sub: requesterDid,
      iat: new Date(Date.now()),
      exp: new Date(Date.now() + validDurationInMinutes * 600000),
      nonce: crypto.randomBytes(32).toString('base64'),
    };

    const jwt = await HubAuthentication.sign({}, accessTokenPayload, privateKey);

    return jwt;
  }

  /**
   * Verifies:
   * 1. JWT signature.
   * 2. Token's subject matches the given requeter DID.
   * 3. Token is not expired.
   *
   * @param publicKey Public key used to verify the given JWT in JWK JSON object format.
   * @param signedJwtString The signed-JWT string.
   * @param expectedRequesterDid Expected requester ID in the 'sub' field of the JWT payload.
   * @returns true if token passes all validation, false otherwise.
   */
  public static verifyAccessToken(publicKey: object, signedJwtString: string, expectedRequesterDid: string): boolean {
    if (!publicKey || !signedJwtString || !expectedRequesterDid) {
      return false;
    }

    try {
      const verifiedData = HubAuthentication.verifySignature(signedJwtString, publicKey);

      // Verify that the token was issued to the same person making the current request.
      const token = JSON.parse(verifiedData);
      if (token.sub !== expectedRequesterDid) {
        return false;
      }

      // Verify that the token is not expired.
      const now = new Date(Date.now());
      const expiry = new Date(token.exp);
      if (now > expiry) {
        return false;
      }

      return true;
    } catch {
      return false;
    }
  }
}
