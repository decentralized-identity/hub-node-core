import BaseController from './BaseController';
import WriteRequest from '../models/WriteRequest';
import WriteResponse from '../models/WriteResponse';
import ObjectQueryResponse from '../models/ObjectQueryResponse';
import ObjectQueryRequest from '../models/ObjectQueryRequest';
import { DidDocument } from '@decentralized-identity/did-common-typescript';

/**
 * This class handles all the collection requests.
 */
export default class CollectionsController extends BaseController {
  async handleCreateRequest(request: WriteRequest): Promise<WriteResponse> {
    return await this.writeCommit(request);
  }

  async handleQueryRequest(request: ObjectQueryRequest): Promise<ObjectQueryResponse> {
    const filters = [
      {
        field: 'interface',
        value: request.interface,
      },
      {
        field: 'context',
        value: request.queryContext,
      },
      {
        field: 'type',
        value: request.queryType,
      },
    ];

    if (request.objectIds) {
      filters.push({
        field: 'object_id',
        value: request.objectIds,
      });
    }

    const queryRequest = {
      filters,
      owner: request.sub,
    };

    const response = await this.context.store.queryObjects(queryRequest);
    console.log(response);
    return new ObjectQueryResponse([]);
  }

  async handleDeleteRequest(request: WriteRequest): Promise<WriteResponse> {
    return await this.writeCommit(request);
  }

  async handleUpdateRequest(request: WriteRequest): Promise<WriteResponse> {
    return await this.writeCommit(request);
  }

  private async objectExists(request: WriteRequest): Promise<boolean> {
    const filters = [
      {
        field: 'interface',
        value: request.interface,
      },
      {
        field: 'context',
        value: request.queryContext,
      },
      {
        field: 'type',
        value: request.queryType,
      },
      {
        field: 'object_id',
        value: request.objectIds,
      },
    ];

    const queryRequest = {
      filters,
      owner: request.sub,
    };

    const response = await this.context.store.queryObjects(queryRequest);
    await queryCommits(commitQuery);

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
