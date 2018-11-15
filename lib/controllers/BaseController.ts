import * as HttpStatus from 'http-status';
import Context from '../interfaces/Context';
import HubError from '../models/HubError';
import WriteRequest from '../models/WriteRequest';
import WriteResponse from '../models/WriteResponse';
import ObjectQueryRequest from '../models/ObjectQueryRequest';
import ObjectQueryResponse from '../models/ObjectQueryResponse';
import BaseRequest from '../models/BaseRequest';
import BaseResponse from '../models/BaseResponse';

/**
 * Abstract controller class for every interface controllers to inherit.
 */
export default abstract class BaseController {

  /** Handles an add request. */
  abstract async handleCreateRequest(request: WriteRequest): Promise<WriteResponse>;
  /** Handles a read request. */
  abstract async handleQueryRequest(request: ObjectQueryRequest): Promise<ObjectQueryResponse>;
  /** Handles a remove request. */
  abstract async handleDeleteRequest(request: WriteRequest): Promise<WriteResponse>;
  /** Handles an update request. */
  abstract async handleUpdateRequest(request: WriteRequest): Promise<WriteResponse>;

  /**
   * Map of request handler methods that can be selected based on the action name.
   */
  protected _handlers: { [name: string]: <T extends BaseRequest, Q extends BaseResponse>(request: T) => Promise<Q> } = {
    create: this.handleCreateRequest,
    read: this.handleQueryRequest,
    delete: this.handleDeleteRequest,
    update: this.handleUpdateRequest,
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
  public async handle(json: string): Promise<BaseResponse> {

    const handler = this._handlers[action];

    if (!handler) {
      return HubResponse.withError(new HubError(`Handling of '${action}' action is not supported.`, HttpStatus.BAD_REQUEST));
    }

    return await handler.call(this, request);
  }
}
