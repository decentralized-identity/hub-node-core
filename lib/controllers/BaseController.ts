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
import { QueryEqualsFilter } from '../interfaces/Store';

/**
 * Abstract controller class for every interface controllers to inherit.
 */
export default abstract class BaseController {

  /** Handles a read request. */
  async handleQueryRequest(request: ObjectQueryRequest, grants: PermissionGrant[]): Promise<ObjectQueryResponse> {
    const filters: QueryEqualsFilter[] = [
      {
        field: 'interface',
        value: request.interface,
        type: 'eq',
      },
    ];

    if (request.queryContext) {
      filters.push({
        field: 'context',
        value: request.queryContext,
        type: 'eq',
      });
    }

    if (request.queryType) {
      filters.push({
        field: 'type',
        value: request.queryType,
        type: 'eq',
      });
    }

    if (request.objectIds) {
      filters.push({
        field: 'object_id',
        value: request.objectIds,
        type: 'eq',
      });
    }

    const queryRequest = {
      filters,
      owner: request.sub,
      skip_token: request.skipToken,
    };

    const response = await this.context.store.queryObjects(queryRequest);
    const prunedResults = await AuthorizationController.pruneResults(response.results, grants);
    return new ObjectQueryResponse(prunedResults, response.pagination.skip_token);
  }
  /** Handles a write commit request. */
  abstract async handleWriteCommitRequest(request: WriteRequest, grants: PermissionGrant[]): Promise<WriteResponse>;

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
        writeRequest.commit.validate(this.context);
        return await this.handleWriteCommitRequest(writeRequest, grants);
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
    const operation = request.commit.getProtectedHeaders().operation as Operation;
    /* istanbul ignore if */
    if (!operation) { // this is covered in Commit
      throw HubError.incorrectParameter('commit.protected.operation');
    }
  }
}
