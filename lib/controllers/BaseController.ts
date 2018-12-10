import Context from '../interfaces/Context';
import HubError, { ErrorCode } from '../models/HubError';
import WriteRequest from '../models/WriteRequest';
import WriteResponse from '../models/WriteResponse';
import ObjectQueryRequest from '../models/ObjectQueryRequest';
import ObjectQueryResponse from '../models/ObjectQueryResponse';
import BaseRequest from '../models/BaseRequest';
import BaseResponse from '../models/BaseResponse';
import { Operation } from '../models/Commit';
import AuthorizationController from './AuthorizationController';
import PermissionGrant from '../models/PermissionGrant';

/**
 * Abstract controller class for every interface controllers to inherit.
 */
export default abstract class BaseController {

  /** Handles an add request. */
  abstract async handleCreateRequest(request: WriteRequest, grants: PermissionGrant[]): Promise<WriteResponse>;
  /** Handles a read request. */
  abstract async handleQueryRequest(request: ObjectQueryRequest, grants: PermissionGrant[]): Promise<ObjectQueryResponse>;
  /** Handles a remove request. */
  abstract async handleDeleteRequest(request: WriteRequest, grants: PermissionGrant[]): Promise<WriteResponse>;
  /** Handles an update request. */
  abstract async handleUpdateRequest(request: WriteRequest, grants: PermissionGrant[]): Promise<WriteResponse>;

  /**
   * Constructor for the BaseController.
   *
   * @param context The context object containing all the injected components.
   * @param authorization An authorization controller object for authorization checks
   */
  constructor(protected context: Context, protected authorization: AuthorizationController) { }

  /**
   * Handles the Hub request.
   */
  public async handle(request: BaseRequest): Promise<BaseResponse> {
    const grants = await this.authorization.getPermissionGrantsForRequest(request);
    if (grants.length === 0) {
      throw new HubError({
        errorCode: ErrorCode.PermissionsRequired,
      });
    }
    switch (request.getType()) {
      case 'ObjectQueryRequest':
        return await this.handleQueryRequest(request as ObjectQueryRequest, grants);
      case 'WriteRequest':
        const writeRequest = request as WriteRequest;
        BaseController.verifyConstraints(writeRequest);
        switch (writeRequest.commit.getProtectedHeaders().operation) {
          case Operation.Create:
            return await this.handleCreateRequest(writeRequest, grants);
          case Operation.Update:
            return await this.handleUpdateRequest(writeRequest, grants);
          case Operation.Delete:
            return await this.handleDeleteRequest(writeRequest, grants);
          default:
            throw HubError.incorrectParameter('commit.protected.operation');
        }
      default:
        throw HubError.incorrectParameter('@type');
    }
  }

  /**
   * Verifies common constraints for commits
   * @param request Request to verify
   */
  private static verifyConstraints(request: WriteRequest) {
    const headers = request.commit.getProtectedHeaders();
    if (request.sub !== headers.sub) {
      throw HubError.incorrectParameter('commit.protected.sub');
    }
  }
}
