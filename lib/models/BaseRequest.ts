import Request from './Request';

/**
 * A hub request of type BaseRequest
 */
export default class BaseRequest extends Request {
  /** interface of the request */
  readonly interface: string;

  /**
   * Constructs a request from the request JSON
   * @param json A json string or object
   */
  constructor(json: string | any) {
    super(json);
    let request = json;
    if (typeof json === 'string') {
      request = JSON.parse(json);
    }
    this.interface = request.interface;
  }

  /**
   * Gets the type of this request
   */
  getType(): string {
    return this.type;
  }
}
