/**
 * Represents a response to a request to the Hub.
 */
export default interface Response {
  /** If the response encryption and signing is okay */
  ok: boolean;
  /** The encrypted response if ok, else the unencrypted error message */
  body: Buffer;
}
