import * as HttpStatus from 'http-status';
import BaseController from './BaseController';
import HubError from '../models/HubError';
import HubRequest from '../models/HubRequest';
import HubResponse from '../models/HubResponse';
import Validation from '../utilities/Validation';
import { StoredObject } from '../interfaces/Store';

export const PROFILE_SCHEMA: string = 'https://schema.identity.foundation/0.1/Profile';

/**
 * This class handles all the profile requests.
 */
export default class ProfileController extends BaseController {
  async handleCreateRequest(request: HubRequest): Promise<HubResponse> {
    return await this.upsert(request);
  }

  async handleExecuteRequest(request: HubRequest): Promise<HubResponse> {
    throw new HubError(`${request.getAction()} handler not implemented.`, HttpStatus.NOT_IMPLEMENTED);
  }

  async handleReadRequest(request: HubRequest): Promise<HubResponse> {
    // audiance is used here because you are allowed to read another's profile
    const result = await this.getProfile(request.aud);

    if (result) {
      return HubResponse.withObject(result);
    }

    return HubResponse.withObject(this.getEmptyObjectForDid(request.aud));
  }

  async handleDeleteRequest(request: HubRequest): Promise<HubResponse> {
    const profiles = await this.context.store.queryDocuments({
      owner: request.iss,
      schema: PROFILE_SCHEMA,
    });

    await profiles.forEach(async (profile) => {
      await this.context.store.deleteDocument({
        owner: request.iss,
        schema: PROFILE_SCHEMA,
        id: profile.id,
      });
    });

    return HubResponse.withSuccess();
  }

  async handleUpdateRequest(request: HubRequest): Promise<HubResponse> {
    return await this.upsert(request);
  }

  /**
   * Retrieves the profile of the did, if found
   */
  private async getProfile(did: string): Promise<StoredObject | undefined> {
    const results = await this.context.store.queryDocuments({
      owner: did,
      schema: PROFILE_SCHEMA,
    });

    if (results.length > 1) {
      console.log(`{"type": "warn", "message": "More than one profile exists for ${did}"}`);
    }

    return results[0];
  }

  /**
   * Returns a blank object
   * @param did The did of the owner of the object
   */
  private getEmptyObjectForDid(did: string): StoredObject {
    return {
      owner: did,
      id: '',
      schema: PROFILE_SCHEMA,
      payload: {},
    };
  }

  /**
   * Given a request, creates or updates the profile object
   * @param request The request used to create or update the profile object
   */
  private async upsert(request: HubRequest): Promise<HubResponse> {
    const payloadField = Validation.requiredValue(request.payload, 'payload');

    const profile = await this.getProfile(request.iss);

    // Update if one exists
    if (profile) {
      const result = await this.context.store.updateDocument({
        owner: request.iss,
        schema: PROFILE_SCHEMA,
        id: profile.id,
        meta: payloadField.meta,
        payload: Validation.requiredValue(payloadField.data, 'request.payload'),
      });

      return HubResponse.withObject(result);
    }

    // No pre-existing Profile, generate a new one
    const result = await this.context.store.createDocument({
      owner: request.iss,
      schema: PROFILE_SCHEMA,
      meta: payloadField.meta,
      payload: Validation.requiredValue(payloadField.data, 'request.payload'),
    });
    return HubResponse.withObject(result);
  }
}
