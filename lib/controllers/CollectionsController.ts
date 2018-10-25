import * as HttpStatus from 'http-status';
import BaseController from './BaseController';
import HubError from '../models/HubError';
import HubRequest from '../models/HubRequest';
import HubResponse from '../models/HubResponse';
import Validation from '../utilities/Validation';
import { PROFILE_SCHEMA } from './ProfileController';

const blockList = [
  PROFILE_SCHEMA,
];

/**
 * This class handles all the collection requests.
 */
export default class CollectionsController extends BaseController {

  /**
   * Throws if the requested schema matches one of the blocked schemas.
   * To be used with internal schemas that would otherwise break other interfaces
   */
  private validateSchemaAgainstBlockList(schema?: string) {
    if (schema && schema in blockList) {
      throw new HubError(`${schema} cannot be modified through collections.`);
    }
  }

  async handleCreateRequest(request: HubRequest): Promise<HubResponse> {
    const requestField = Validation.requiredValue(request.request, 'request');
    const payloadField = Validation.requiredValue(request.payload, 'payload');
    this.validateSchemaAgainstBlockList(request.request ? request.request.schema : undefined);

    const result = await this.context.store.createDocument({
      owner: request.aud,
      schema: Validation.requiredValue(requestField.schema, 'request.schema'),
      meta: payloadField.meta,
      payload: Validation.requiredValue(payloadField.data, 'request.payload'),
    });

    return HubResponse.withObject(result);
  }

  async handleExecuteRequest(request: HubRequest): Promise<HubResponse> {
    throw new HubError(`${request.getAction()} handler not implemented.`, HttpStatus.NOT_IMPLEMENTED);
  }

  async handleReadRequest(request: HubRequest): Promise<HubResponse> {
    const requestField = Validation.requiredValue(request.request, 'request');
    this.validateSchemaAgainstBlockList(request.request ? request.request.schema : undefined);

    const results = await this.context.store.queryDocuments({
      owner: request.aud,
      schema: Validation.requiredValue(requestField.schema, 'request.schema'),
    });

    return HubResponse.withObjects(results);
  }

  async handleDeleteRequest(request: HubRequest): Promise<HubResponse> {
    const requestField = Validation.requiredValue(request.request, 'request');
    this.validateSchemaAgainstBlockList(request.request ? request.request.schema : undefined);

    await this.context.store.deleteDocument({
      owner: request.aud,
      schema: Validation.requiredValue(requestField.schema, 'request.schema'),
      id: Validation.requiredValue(requestField.id, 'request.id'),
    });

    return HubResponse.withSuccess();
  }

  async handleUpdateRequest(request: HubRequest): Promise<HubResponse> {
    const requestField = Validation.requiredValue(request.request, 'request');
    const payloadField = Validation.requiredValue(request.payload, 'payload');
    this.validateSchemaAgainstBlockList(request.request ? request.request.schema : undefined);

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
