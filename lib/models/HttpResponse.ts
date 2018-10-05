/**
 * Represents a response to a request to the Hub.
 */
export default interface HttpResponse {
  statusCode: number;
  body: Buffer;
}
