/**
 * Class for performing various DID document operations.
 */
export default class DidDocument {

  /**
   * Returns the DID within the key ID given.
   * @param keyId A fully-qualified key ID. e.g. 'did:example:abc#key1'
   * @example 'did:example:abc#key1' returns 'did:example:abc'
   */
  public static getDidFromKeyId(keyId: string): string {
    const didLength = keyId.indexOf('#');
    const did = keyId.substr(0, didLength);

    return did;
  }
}
