import * as HttpStatus from 'http-status';
import Context from '../interfaces/Context';
import HubError from '../models/HubError';
import HubRequest from '../models/HubRequest';
import HubResponse from '../models/HubResponse';

/**
 * Abstract controller class for every interface controllers to inherit.
 */
export default abstract class BaseController {

  /** Handles an add request. */
  abstract async handleAddRequest(request: HubRequest): Promise<HubResponse>;
  /** Handles an execute request. */
  abstract async handleExecuteRequest(request: HubRequest): Promise<HubResponse>;
  /** Handles a read request. */
  abstract async handleReadRequest(request: HubRequest): Promise<HubResponse>;
  /** Handles a remove request. */
  abstract async handleRemoveRequest(request: HubRequest): Promise<HubResponse>;
  /** Handles an update request. */
  abstract async handleUpdateRequest(request: HubRequest): Promise<HubResponse>;

  /**
   * Map of request handler methods that can be selected based on the action name.
   */
  protected _handlers: { [name: string]: (request: HubRequest) => Promise<HubResponse> } = {
    'add': this.handleAddRequest,
    'execute': this.handleExecuteRequest,
    'read': this.handleReadRequest,
    'remove': this.handleRemoveRequest,
    'update': this.handleUpdateRequest,
  };

  /**
   * Constructor for the BaseController.
   * 
   * @param context The context object containing all the injected components.
   */
  constructor(protected context: Context) { }

  /**
   * Handles the Hub request.
   */
  public async handle(request: HubRequest): Promise<HubResponse> {
    const action = request.getAction();
    const handler = this._handlers[action];

    if (!handler) {
      return HubResponse.withError(new HubError(`Handling of '${action}' action is not supported.`, HttpStatus.BAD_REQUEST));
    }

    return await handler.call(this, request);
  }
}
