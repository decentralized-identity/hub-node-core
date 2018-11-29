import * as HttpStatus from 'http-status';
import BaseController from './BaseController';
import HubError from '../models/HubError';
import HubRequest from '../models/HubRequest';
import HubResponse from '../models/HubResponse';
import PermissionGrant, { PERMISSION_GRANT_SCHEMA } from '../models/PermissionGrant';

/**
 * This class handles all the permission requests.
 */
export default class PermissionsController extends BaseController {
  async handleCreateRequest(request: HubRequest): Promise<HubResponse> {
    PermissionsController.validateSchema(request);
    const permission = PermissionsController.getPermissionGrant(request);

    const result = await this.context.store.createDocument({
      owner: request.aud,
      schema: PERMISSION_GRANT_SCHEMA,
      payload: permission,
    });

    return HubResponse.withObject(result);
  }

  async handleExecuteRequest(request: HubRequest): Promise<HubResponse> {
    throw new HubError(`${request.getAction()} handler not implemented.`, HttpStatus.NOT_IMPLEMENTED);
  }

  async handleReadRequest(request: HubRequest): Promise<HubResponse> {
    PermissionsController.validateSchema(request);

    const results = await this.context.store.queryDocuments({
      owner: request.aud,
      schema: PERMISSION_GRANT_SCHEMA,
    });

    if (request.request && request.request.id) {
      const id = request.request.id;
      const match = results.filter(result => result.id === id);
      if (match.length > 0) {
        return HubResponse.withObject(match[0]);
      }
      return HubResponse.withError(new HubError('Permission not found', 404));
    }
    return HubResponse.withObjects(results);
  }

  async handleDeleteRequest(request: HubRequest): Promise<HubResponse> {
    PermissionsController.validateSchema(request);

    if (!request.request || !request.request.id) {
      throw new HubError('request.id is required', 400);
    }

    const id = request.request.id;

    await this.context.store.deleteDocument({
      id,
      owner: request.aud,
      schema: PERMISSION_GRANT_SCHEMA,
    });

    return HubResponse.withSuccess();
  }

  async handleUpdateRequest(request: HubRequest): Promise<HubResponse> {
    PermissionsController.validateSchema(request);
    const permission = PermissionsController.getPermissionGrant(request);
    if (!request.request || !request.request.id) {
      throw new HubError('request.id is required', 400);
    }

    const id = request.request.id;

    const result = await this.context.store.updateDocument({
      id,
      owner: request.aud,
      schema: PERMISSION_GRANT_SCHEMA,
      payload: permission,
    });

    return HubResponse.withObject(result);
  }

  // given a hub request, attempts to retrieve the PermissionGrant from it's payload
  private static getPermissionGrant(request: HubRequest): PermissionGrant {
    if (!request.payload) {
      throw new HubError('request.payload required', 400);
    }
    const permission = request.payload.data as PermissionGrant;
    if (!permission.owner ||
        !permission.grantee ||
        !permission.allow ||
        !permission.object_type ||
        !permission.created_by) {
      throw new HubError('request.payload.data must be a PermissionGrant.', 400);
    }
    return permission;
  }

  // given a hub request, validates the request contains the permission grant schema
  private static validateSchema(request: HubRequest) {
    if (!request.request || !request.request.schema) {
      throw new HubError('request.schema required', 400);
    }
    if (request.request.schema !== PERMISSION_GRANT_SCHEMA) {
      throw new HubError(`request.schema must be ${PERMISSION_GRANT_SCHEMA}`, 400);
    }
  }
}
