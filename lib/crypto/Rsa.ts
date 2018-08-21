// TODO: Create and reference TypeScript definition file for 'jwk-to-pem'
const jwkToPem = require('jwk-to-pem');
import * as crypto from 'crypto';
import * as constants from 'constants';

/**
 * Class for performing various RSA cryptographic operations.
 */
export default class Rsa {

  /**
   * Verifies the given signed content using RS256 algorithm.
   *
   * @returns true if passed signature verification, false otherwise.
   */
  public static verifySignatureRS256(signedContent: string, signature: string, jwk: object): boolean {
    const publicKey = jwkToPem(jwk);
    const verifier = crypto.createVerify('RSA-SHA256');
    verifier.write(signedContent);

    const passedVerification = verifier.verify(publicKey, signature, 'base64');
    return passedVerification;
  }

  /**
   * Verifies the given signed content using RS512 algorithm.
   *
   * @returns true if passed signature verification, false otherwise.
   */
  public static verifySignatureRS512(signedContent: string, signature: string, jwk: object): boolean {
    const publicKey = jwkToPem(jwk);
    const verifier = crypto.createVerify('RSA-SHA512');
    verifier.write(signedContent);

    const passedVerification = verifier.verify(publicKey, signature, 'base64');
    return passedVerification;
  }

  /**
   * RSA-OAEP encrypts the given data using the given public key in JWK format.
   */
  public static encryptRSAOAEP(data: Buffer, jwk: object): Buffer {
    const publicKey = jwkToPem(jwk);
    const encryptedDataBuffer = crypto.publicEncrypt({ key: publicKey, padding: constants.RSA_PKCS1_OAEP_PADDING }, data);

    return encryptedDataBuffer;
  }
}
