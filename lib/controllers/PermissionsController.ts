import BaseController from './BaseController';
import HubError, { ErrorCode, DeveloperMessage } from '../models/HubError';
import PermissionGrant, { PERMISSION_GRANT_CONTEXT, PERMISSION_GRANT_TYPE } from '../models/PermissionGrant';
import ObjectQueryRequest from '../models/ObjectQueryRequest';
import ObjectQueryResponse, { ObjectContainer } from '../models/ObjectQueryResponse';
import WriteRequest from '../models/WriteRequest';
import WriteResponse from '../models/WriteResponse';

/**
 * This class handles all the permission requests.
 */
export default class PermissionsController extends BaseController {

  async handleQueryRequest(request: ObjectQueryRequest, grants: PermissionGrant[]): Promise<ObjectQueryResponse> {
    // verify context and type
    if (request.queryContext !== PERMISSION_GRANT_CONTEXT || request.queryType !== PERMISSION_GRANT_TYPE) {
      throw new HubError({
        errorCode: ErrorCode.BadRequest,
        developerMessage: `query 'context' must be '${PERMISSION_GRANT_CONTEXT}', 'type' must be '${PERMISSION_GRANT_TYPE}'`,
      });
    }

    const results = await this.context.store.queryObjects({
      owner: request.sub,
      filters: [
        {
          field: 'interface',
          type: 'eq',
          value: 'Permissions',
        },
        {
          field: 'context',
          type: 'eq',
          value: PERMISSION_GRANT_CONTEXT,
        },
        {
          field: 'type',
          type: 'eq',
          value: PERMISSION_GRANT_TYPE,
        },
      ],
    });

    const createdByRestrictions: string[] = [];
    let allPermissions = false;
    grants.forEach((grant) => {
      if (!grant.created_by || allPermissions) {
        allPermissions = true;
        return;
      }
      createdByRestrictions.push(grant.created_by);
    });

    if (allPermissions) {
      return new ObjectQueryResponse(results.results, results.pagination.skip_token);
    }

    const prunedResults: ObjectContainer[] = [];
    results.results.forEach((result) => {
      if (createdByRestrictions.includes(result.created_by) {
        prunedResults.push(result);
      }
    });

    return new ObjectQueryResponse(prunedResults, results.pagination.skip_token);
  }

  async handleCreateRequest(request: HubRequest): Promise<WriteResponse> {
    PermissionsController.validateSchema(request);
    const permission = PermissionsController.getPermissionGrant(request);

    const result = await this.context.store.createDocument({
      owner: request.aud,
      schema: PERMISSION_GRANT_SCHEMA,
      payload: permission,
    });

    return HubResponse.withObject(result);
  }

  async handleDeleteRequest(request: WriteRequest): Promise<WriteResponse> {
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

  async handleUpdateRequest(request: WriteRequest): Promise<WriteResponse> {
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
  private static getPermissionGrant(request: WriteRequest): PermissionGrant {
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
  private static validateSchema(request: WriteRequest) {
    if (!request.request || !request.request.schema) {
      throw new HubError('request.schema required', 400);
    }
    if (request.request.schema !== PERMISSION_GRANT_SCHEMA) {
      throw new HubError(`request.schema must be ${PERMISSION_GRANT_SCHEMA}`, 400);
    }
  }
}
