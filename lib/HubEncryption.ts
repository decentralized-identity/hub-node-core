const jose = require('node-jose');

/**
 * Class for performing various Hub encryption operations.
 */
export default class HubAuthentication {
  /**
   * Encrypts the given string in JWE compact serialized format using the given key in JWK JSON object format.
   * Content encryption algorithm is hardcoded to 'A128GCM'.
   *
   * @returns Encrypted Buffer in JWE compact serialized format.
   */
  public static async encrypt(content: string, jwk: object): Promise<Buffer> {
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
