import * as HttpStatus from 'http-status';
import BaseController from './BaseController';
import HubError from '../models/HubError';
import HubRequest from '../models/HubRequest';
import HubResponse from '../models/HubResponse';
import Validation from '../utilities/Validation';

const ACTION_SCHEMA: string = 'http://schema.identity.foundation/Action';

/**
 * This class handles all the action requests.
 */
export default class ActionsController extends BaseController {
  async handleAddRequest(request: HubRequest): Promise<HubResponse> {
    const payloadField = Validation.requiredValue(request.payload, 'payload');

    const result = await this.context.store.createDocument({
      owner: request.aud,
      schema: ACTION_SCHEMA,
      meta: payloadField.meta,
      payload: Validation.requiredValue(payloadField.data, 'request.payload'),
    });

    return HubResponse.withObject(result);
  }

  async handleExecuteRequest(request: HubRequest): Promise<HubResponse> {
    throw new HubError(`${request.getAction()} handler not implemented.`, HttpStatus.NOT_IMPLEMENTED);
  }

  async handleReadRequest(request: HubRequest): Promise<HubResponse> {
    const results = await this.context.store.queryDocuments({
      owner: request.aud,
      schema: ACTION_SCHEMA,
    });

    return HubResponse.withObjects(results);
  }

  async handleRemoveRequest(request: HubRequest): Promise<HubResponse> {
    const requestField = Validation.requiredValue(request.request, 'request');

    await this.context.store.deleteDocument({
      owner: request.aud,
      schema: ACTION_SCHEMA,
      id: Validation.requiredValue(requestField.id, 'request.id'),
    });

    return HubResponse.withSuccess();
  }

  async handleUpdateRequest(request: HubRequest): Promise<HubResponse> {
    const requestField = Validation.requiredValue(request.request, 'request');
    const payloadField = Validation.requiredValue(request.payload, 'payload');

    const result = await this.context.store.updateDocument({
      owner: request.aud,
      schema: ACTION_SCHEMA,
      id: Validation.requiredValue(requestField.id, 'request.id'),
      meta: payloadField.meta,
      payload: Validation.requiredValue(payloadField.data, 'request.payload'),
    });

    return HubResponse.withObject(result);
  }
}
