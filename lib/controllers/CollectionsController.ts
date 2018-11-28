import BaseController from './BaseController';
import WriteRequest from '../models/WriteRequest';
import WriteResponse from '../models/WriteResponse';
import ObjectQueryResponse from '../models/ObjectQueryResponse';
import ObjectQueryRequest from '../models/ObjectQueryRequest';
import { QueryEqualsFilter } from '../interfaces/Store';
import HubError, { ErrorCode, DeveloperMessage } from '../models/HubError';

/**
 * This class handles all the collection requests.
 */
export default class CollectionsController extends BaseController {
  async handleCreateRequest(request: WriteRequest): Promise<WriteResponse> {
    if (request.commit.getProtectedHeaders().object_id) {
      throw new HubError({
        errorCode: ErrorCode.BadRequest,
        developerMessage: DeveloperMessage.AlreadyExists,
      });
    }
    return await this.writeCommit(request);
  }

  async handleQueryRequest(request: ObjectQueryRequest): Promise<ObjectQueryResponse> {
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
    return new ObjectQueryResponse(response.results, response.pagination.skip_token);
  }

  async handleDeleteRequest(request: WriteRequest): Promise<WriteResponse> {
    if (!this.objectExists(request)) {
      throw new HubError({
        errorCode: ErrorCode.NotFound,
      });
    }
    return await this.writeCommit(request);
  }

  async handleUpdateRequest(request: WriteRequest): Promise<WriteResponse> {
    if (!this.objectExists(request)) {
      throw new HubError({
        errorCode: ErrorCode.NotFound,
      });
    }
    return await this.writeCommit(request);
  }

  private async objectExists(request: WriteRequest): Promise<boolean> {
    const commitHeaders = request.commit.getProtectedHeaders();
    const filters: QueryEqualsFilter[] = [
      {
        field: 'interface',
        value: commitHeaders.interface,
        type: 'eq',
      },
      {
        field: 'object_id',
        value: commitHeaders.object_id,
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
