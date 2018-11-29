import BaseController from './BaseController';
import WriteRequest from '../models/WriteRequest';
import WriteResponse from '../models/WriteResponse';
import ObjectQueryResponse from '../models/ObjectQueryResponse';
import ObjectQueryRequest from '../models/ObjectQueryRequest';
import { QueryEqualsFilter } from '../interfaces/Store';
import HubError, { ErrorCode, DeveloperMessage } from '../models/HubError';
import PermissionGrant from '../models/PermissionGrant';
import AuthorizationController from './AuthorizationController';

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
    return await this.writeCommit(request);
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
    if (!await this.objectExists(request, grants)) {
      throw new HubError({
        errorCode: ErrorCode.NotFound,
      });
    }
    return await this.writeCommit(request);
  }

  async handleUpdateRequest(request: WriteRequest, grants: PermissionGrant[]): Promise<WriteResponse> {
    if (!await this.objectExists(request, grants)) {
      throw new HubError({
        errorCode: ErrorCode.NotFound,
      });
    }
    return await this.writeCommit(request);
  }

  private async objectExists(request: WriteRequest, grants?: PermissionGrant[]): Promise<boolean> {
    const commitHeaders = request.commit.getProtectedHeaders();
    const filters: QueryEqualsFilter[] = [
      {
        field: 'interface',
        value: commitHeaders.interface,
        type: 'eq',
      },
      {
        field: 'object_id',
        value: [commitHeaders.object_id],
        type: 'eq',
      },
      {
        field: 'context',
        value: commitHeaders.context,
        type: 'eq',
      },
      {
        field: 'type',
        value: commitHeaders.type,
        type: 'eq',
      },
    ];

    const queryRequest = {
      filters,
      owner: commitHeaders.sub,
    };

    const response = await this.context.store.queryObjects(queryRequest);

    if (response.results.length > 1) {
      throw new HubError({
        errorCode: ErrorCode.ServerError,
      });
    } else if (response.results.length === 1 && grants) {
      let authorized = false;
      grants.forEach((grant) => {
        if ((!grant.created_by) ||
          (response.results[0].created_by === grant.created_by)) {
          authorized = true;
        }
      });
      if (!authorized) {
        throw new HubError({
          errorCode: ErrorCode.PermissionsRequired,
        });
      }
    }

    return response.results.length > 0;
  }

  private async writeCommit(request: WriteRequest): Promise<WriteResponse> {
    const commitRequest = {
      owner: request.sub,
      commit: request.commit,
    };
    const response = await this.context.store.commit(commitRequest);
    return new WriteResponse(response.knownRevisions);
  }

}
