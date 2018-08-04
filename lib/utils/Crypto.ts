const jose = require('node-jose');

/**
 * Class for performing various cryptographic operations.
 */
export default class Crypto {

  /**
   * Verifies the given JWS using the given key in JWK JSON object format.
   *
   * @returns The payload if signature is verified. Throws exception otherwise.
   */
  public static async verifySignature(jwsString: string, jwk: object): Promise<string> {
    const key = await jose.JWK.asKey(jwk);
    const verifiedData = await jose.JWS.createVerify(key).verify(jwsString);

    return verifiedData.payload.toString();
  }

  /**
   * Verifies:
   * 1. JWT signature.
   * 2. Token's subject matches the given requeter DID.
   * 3. Token is not expired.
   *
   * @param publicKey Public key that signed the given JWT.
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
   */
  public static async signThenEncrypt(content: object, signingKey: object, encryptingKey: object): Promise<Buffer> {
    const jwsCompactString = await Crypto.sign(content, signingKey);
    const signedThenEncryptedContent = await Crypto.encrypt(jwsCompactString, encryptingKey);

    return signedThenEncryptedContent;
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
