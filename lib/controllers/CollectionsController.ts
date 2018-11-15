import BaseController from './BaseController';
import Validation from '../utilities/Validation';
import WriteRequest from '../models/WriteRequest';
import WriteResponse from '../models/WriteResponse';
import ObjectQueryResponse from '../models/ObjectQueryResponse';
import ObjectQueryRequest from '../models/ObjectQueryRequest';

/**
 * This class handles all the collection requests.
 */
export default class CollectionsController extends BaseController {
  async handleCreateRequest(request: WriteRequest): Promise<WriteResponse> {
    const headers = request.commit.getHeaders();
    const result = await this.context.store.createDocument({
      owner: request.sub,
      schema: `${headers.context}${headers.context.endsWith('/') ? '' : '/'}${headers.type}`,

    });

    return new WriteResponse([]);
  }

  async handleQueryRequest(request: ObjectQueryRequest): Promise<ObjectQueryResponse> {
    const requestField = Validation.requiredValue(request.request, 'request');

    const results = await this.context.store.queryDocuments({
      owner: request.aud,
      schema: Validation.requiredValue(requestField.schema, 'request.schema'),
    });

    return HubResponse.withObjects(results);
  }

  async handleDeleteRequest(request: WriteRequest): Promise<WriteResponse> {
    const requestField = Validation.requiredValue(request.request, 'request');

    await this.context.store.deleteDocument({
      owner: request.aud,
      schema: Validation.requiredValue(requestField.schema, 'request.schema'),
      id: Validation.requiredValue(requestField.id, 'request.id'),
    });

    return HubResponse.withSuccess();
  }

  async handleUpdateRequest(request: WriteRequest): Promise<WriteResponse> {
    const requestField = Validation.requiredValue(request.request, 'request');
    const payloadField = Validation.requiredValue(request.payload, 'payload');

    const result = await this.context.store.updateDocument({
      owner: request.aud,
      schema: Validation.requiredValue(requestField.schema, 'request.schema'),
      id: Validation.requiredValue(requestField.id, 'request.id'),
      meta: payloadField.meta,
      payload: Validation.requiredValue(payloadField.data, 'request.payload'),
    });

    return HubResponse.withObject(result);
  }

}
