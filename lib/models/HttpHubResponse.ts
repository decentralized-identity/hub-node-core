/**
 * Represents a response to a request to the Hub.
 */
export default interface HttpHubResponse {
  statusCode: number;
  body: Buffer;
}
