/**
 * Class for performing various DID lookup operations.
 */
export default class DidResolver {

  /**
   * // TODO: Provide implementation.
   * Gets the public key in JWK format given the fully-qualified key ID.
   *
   * @param keyId A fully-qualified key ID. e.g. 'did:example:abc#key1'
   */
  public static lookUpPublicKey(keyId: string): object {
    console.log(`TODO: Public key look-up for ${keyId} is not implemented.`);
    return {};
  }
}
