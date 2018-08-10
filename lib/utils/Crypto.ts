import Jose from './Jose';
import HubError from '../models/HubError';
import Rsa from '../crypto/Rsa';

const jose = require('node-jose');

/**
 * Definition for a delegate that can verfiy signed data.
 */
type VerifySignatureDelegate = (signedContent: string, signature: string, jwk: object) => boolean;

/**
 * Class for performing various cryptographic operations.
 */
export default class Crypto {

  /**
   * Verifies the given JWS compact serialized string using the given key in JWK object format.
   *
   * @returns The payload if signature is verified. Throws exception otherwise.
   */
  public static async verifySignature(jwsString: string, jwk: object): Promise<string> {
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
      nonce: jose.util.randomBytes(64).toString('base64'),
    };

    const jwt = await Crypto.sign({}, accessTokenPayload, privateKey);

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
  public static async verifyAccessToken(publicKey: object, signedJwtString: string, expectedRequesterDid: string): Promise<boolean> {
    if (!publicKey || !signedJwtString || !expectedRequesterDid) {
      return false;
    }

    try {
      const keyPair = await jose.JWK.asKey(publicKey);
      const verifiedData = await jose.JWS.createVerify(keyPair).verify(signedJwtString);

      // Verify that the token was issued to the same person making the current request.
      const token = JSON.parse(verifiedData.payload);
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

  /**
   * JWS-signs the given content using the given signing key,
   * then JWE-encrypts the JWS using the given key encryption key.
   * Content encryption algorithm is hardcoded to 'A128GCM'.
   *
   * @param jwsHeaderParameters Header parameters in addition to 'alg' and 'kid' to be included in the JWS.
   */
  public static async signThenEncrypt(
    jwsHeaderParameters: { [name: string]: string },
    content: object | string,
    signingKey: object,
    encryptingKey: object) : Promise<Buffer> {
    const jwsCompactString = await Crypto.sign(jwsHeaderParameters, content, signingKey);
    const signedThenEncryptedContent = await Crypto.encrypt(jwsCompactString, encryptingKey);

    return signedThenEncryptedContent;
  }

  /**
   * Sign the given content using the given private key in JWK format.
   *
   * @param jwsHeaderParameters Header parameters in addition to 'alg' and 'kid' to be included in the JWS.
   * @returns Signed payload in compact JWS format.
   */
  private static async sign(jwsHeaderParameters: { [name: string]: string }, content: object | string, jwk: object): Promise<string> {
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
   * Encrypts the given string in JWE compact serialized format using the given key in JWK JSON object format.
   * Content encryption algorithm is hardcoded to 'A128GCM'.
   *
   * @returns Encrypted Buffer in JWE compact serialized format.
   */
  private static async encrypt(content: string, jwk: object): Promise<Buffer> {
    const jweJson = await jose.JWE.createEncrypt({ contentAlg: 'A128GCM', format: 'compact' }, jwk)
    .update(Buffer.from(content))
    .final();

    return Buffer.from(jweJson);
  }

  /**
   * Decrypts the given JWE compact serialized string using the given key in JWK JSON object format.
   *
   * @returns Decrypted plaintext.
   */
  public static async decrypt(jweString: string, jwk: object): Promise<string> {
    const key = await jose.JWK.asKey(jwk); // NOTE: Must use library object for decryption.
    const decryptedData = await jose.JWE.createDecrypt(key).decrypt(jweString);
    const decryptedPlaintext = decryptedData.plaintext.toString();

    return decryptedPlaintext;
  }
}
