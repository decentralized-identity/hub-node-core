import HubError from './HubError';

/**
 * A generic hub request. All requests contain these fields
 */
export default abstract class BaseRequest {
  /** \@context of the request schema */
  public static readonly context = 'https://schema.identity.foundation/0.1';
  /** \@type of the request */
  protected type: string;
  /** did of the issuer of the request */
  readonly iss: string;
  /** did of the intended recipient of the request */
  readonly aud: string;
  /** did of the indended audiance of the request */
  readonly sub: string;

  /**
   * Constructs a request from the request JSON
   * @param json A json string or object
   */
  constructor(json: string | any) {
    let request = json;
    if (typeof json === 'string') {
      request = JSON.parse(json);
    }
    if (BaseRequest.context !== request['@context']) {
      throw HubError.incorrectParameter('@context');
    }
    ['@type', 'iss', 'aud', 'sub'].forEach((property) => {
      if (!(property in request)) {
        throw HubError.missingParameter(property);
      }
    });
    if (typeof request['@type'] !== 'string') {
      throw HubError.incorrectParameter('@type');
    }
    this.type = request['@type'];
    this.iss = request.iss;
    this.aud = request.aud;
    this.sub = request.sub;
  }

  /**
   * Gets the type of this request
   */
  getType(): string {
    return this.type;
  }

  /**
   * Gets the type of the request
   * @param json request as JSON
   */
  static getTypeFromJson(json: string | any): string {
    let request = json;
    if (typeof json === 'string') {
      request = JSON.parse(json);
    }
    if (typeof request['@type'] !== 'string') {
      throw HubError.incorrectParameter('@type');
    }
    return request['@type'];
  }
}
