import HubError from './models/HubError';
import Base64Url from './utilities/Base64Url';
import * as crypto from 'crypto';
import Rsa from './crypto/Rsa';

// TODO: Rewrite decrypt() to allow additional cryptographic algorithms to be added easily then remove dependency on 'node-jose'.
const jose = require('node-jose');

/**
 * Definition for a delegate that can encrypt data.
 */
type EncryptDelegate = (data: Buffer, jwk: object) => Buffer;

/**
 * Class for performing various Hub encryption operations.
 */
export default class HubEncryption {
  /**
   * Encrypts the given string in JWE compact serialized format using the given key in JWK JSON object format.
   * Content encryption algorithm is hardcoded to 'A128GCM'.
   *
   * @returns Encrypted Buffer in JWE compact serialized format.
   */
  public static async encrypt(content: string, jwk: any): Promise<Buffer> {

    // Deicde key encryption algorithm base on given JWK.
    const keyEncryptionAlgorithm = HubEncryption.getKeyEncryptionAlgorithm(jwk);

    // Construct header.
    const header = {
      kid: jwk.kid,
      alg: keyEncryptionAlgorithm,
      enc: 'A128GCM',
    };

    // Base 64 encode header.
    const protectedHeaderBase64Url = Base64Url.encode(JSON.stringify(header));

    // Generate content encryption key.
    const keyBuffer = crypto.randomBytes(16);

    // Encrypt content encryption key then base64-url encode it.
    const encryptedKeyBuffer = HubEncryption.encryptContentEncryptionKey(keyEncryptionAlgorithm, keyBuffer, jwk);
    const encryptedKeyBase64Url = Base64Url.encode(encryptedKeyBuffer);

    // Generate initialization vector then base64-url encode it.
    const initializationVectorBuffer = crypto.randomBytes(12);
    const initializationVectorBase64Url = Base64Url.encode(initializationVectorBuffer);

    // Encrypt content.
    const cipher = crypto.createCipheriv('aes-128-gcm', keyBuffer, initializationVectorBuffer);
    cipher.setAAD(Buffer.from(protectedHeaderBase64Url));
    const ciphertextBuffer = Buffer.concat([
      cipher.update(Buffer.from(content)),
      cipher.final(),
    ]);
    const ciphertextBase64Url = Base64Url.encode(ciphertextBuffer);

    // Get the authentication tag.
    const authenticationTagBuffer = cipher.getAuthTag();
    const authenticationTagBase64Url = Base64Url.encode(authenticationTagBuffer);

    // Form final compact serialized JWE string.
    const jweString =
    ` ${protectedHeaderBase64Url}.${encryptedKeyBase64Url}.${initializationVectorBase64Url}.${ciphertextBase64Url}.${authenticationTagBase64Url}`;

    return Buffer.from(jweString);
  }

  /**
   * Encrypts the given content encryption key using the specified algorithm and asymmetric public key.
   *
   * @param keyEncryptionAlgorithm Asymmetric encryption algorithm to be used.
   * @param keyBuffer The content encryption key to be encrypted.
   * @param jwk The asymmetric public key used to encrypt the content encryption key.
   */
  private static encryptContentEncryptionKey(keyEncryptionAlgorithm: string, keyBuffer: Buffer, jwk: any): Buffer {
    let encrypt: EncryptDelegate;
    switch (keyEncryptionAlgorithm) {
      case 'RSA-OAEP':
        encrypt = Rsa.encryptRSAOAEP;
        break;
      default:
        throw new HubError(`Unsupported key encryption algorithm: ${keyEncryptionAlgorithm}`, 400);
    }

    return encrypt(keyBuffer, jwk);
  }

  /**
   * Gets the asymmetric encryption algorithm to be used to encrypt the content encryption key based on the given key in JWK format.
   */
  private static getKeyEncryptionAlgorithm(jwk: any): string {
    const keyType = jwk.kty.toUpperCase();
    switch (keyType) {
      case 'RSA':
        return 'RSA-OAEP';
      default:
        throw new HubError(`Unsupported key type: ${keyType}`, 400);
    }
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
