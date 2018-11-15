import Context from '../interfaces/Context';
import HubError, { ErrorCode, DeveloperMessage } from '../models/HubError';
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
   * Constructor for the BaseController.
   *
   * @param context The context object containing all the injected components.
   */
  constructor(protected context: Context) { }

  /**
   * Handles the Hub request.
   */
  public async handle(request: BaseRequest): Promise<BaseResponse> {
    switch (request.getType()) {
      case 'ObjectQueryRequest':
        return await this.handleQueryRequest(request as ObjectQueryRequest);
      case 'WriteRequest':
        const writeRequest = request as WriteRequest;
        switch (writeRequest.commit.getHeaders().operation) {
          case 'create':
            return await this.handleCreateRequest(writeRequest);
          case 'update':
            return await this.handleUpdateRequest(writeRequest);
          case 'delete':
            return await this.handleDeleteRequest(writeRequest);
          default:
            throw new HubError({
              errorCode: ErrorCode.BadRequest,
              property: 'commit.protected.operation',
              developerMessage: DeveloperMessage.IncorrectParameter,
            });
        }
      default:
        throw new HubError({
          errorCode: ErrorCode.BadRequest,
          property: '@type',
          developerMessage: DeveloperMessage.IncorrectParameter,
        });
    }
  }
}
