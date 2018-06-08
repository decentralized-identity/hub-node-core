/**
 * Optional parameters that can be used when invoking the Hub request handler.
 */
export default interface RequestOptions {
  /**
   * ID of the public key of the Hub DID used to encrypt the Hub request.
   * The request buffer must be encrypted if this is specified;
   * the request buffer is assumed to be unencrypted if this is not specified.
   */
  hubKeyId: string;
}