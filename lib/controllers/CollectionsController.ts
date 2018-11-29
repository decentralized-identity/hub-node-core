import BaseController from './BaseController';
import WriteRequest from '../models/WriteRequest';
import WriteResponse from '../models/WriteResponse';
import ObjectQueryResponse from '../models/ObjectQueryResponse';
import ObjectQueryRequest from '../models/ObjectQueryRequest';
import { QueryEqualsFilter } from '../interfaces/Store';
import HubError, { ErrorCode, DeveloperMessage } from '../models/HubError';
import PermissionGrant from '../models/PermissionGrant';
import AuthorizationController from './AuthorizationController';
import StoreUtils from '../utilities/StoreUtils';

/**
 * This class handles all the collection requests.
 */
export default class CollectionsController extends BaseController {
  async handleCreateRequest(request: WriteRequest, _: PermissionGrant[]): Promise<WriteResponse> {
    if (request.commit.getProtectedHeaders().object_id) {
      throw new HubError({
        errorCode: ErrorCode.BadRequest,
        developerMessage: DeveloperMessage.AlreadyExists,
      });
    }
    return StoreUtils.writeCommit(request, this.context.store);
  }

  async handleQueryRequest(request: ObjectQueryRequest, grants: PermissionGrant[]): Promise<ObjectQueryResponse> {
    const filters: QueryEqualsFilter[] = [
      {
        field: 'interface',
        value: request.interface,
        type: 'eq',
      },
      {
        field: 'context',
        value: request.queryContext,
        type: 'eq',
      },
      {
        field: 'type',
        value: request.queryType,
        type: 'eq',
      },
    ];

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

  async handleDeleteRequest(request: WriteRequest, grants: PermissionGrant[]): Promise<WriteResponse> {
    if (!await StoreUtils.objectExists(request, this.context.store, grants)) {
      throw new HubError({
        errorCode: ErrorCode.NotFound,
      });
    }
    return StoreUtils.writeCommit(request, this.context.store);
  }

  async handleUpdateRequest(request: WriteRequest, grants: PermissionGrant[]): Promise<WriteResponse> {
    if (!await StoreUtils.objectExists(request, this.context.store, grants)) {
      throw new HubError({
        errorCode: ErrorCode.NotFound,
      });
    }
    return StoreUtils.writeCommit(request, this.context.store);
  }

}
