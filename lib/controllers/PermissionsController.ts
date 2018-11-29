import BaseController from './BaseController';
import HubError, { ErrorCode, DeveloperMessage } from '../models/HubError';
import PermissionGrant, { PERMISSION_GRANT_CONTEXT, PERMISSION_GRANT_TYPE } from '../models/PermissionGrant';
import ObjectQueryRequest from '../models/ObjectQueryRequest';
import ObjectQueryResponse from '../models/ObjectQueryResponse';
import ObjectContainer from '../interfaces/ObjectContainer';

import WriteRequest from '../models/WriteRequest';
import WriteResponse from '../models/WriteResponse';
import AuthorizationController from './AuthorizationController';
import StoreUtils from '../utilities/StoreUtils';

/**
 * This class handles all the permission requests.
 */
export default class PermissionsController extends BaseController {

  async handleQueryRequest(request: ObjectQueryRequest, grants: PermissionGrant[]): Promise<ObjectQueryResponse> {
    // verify context and type, not using validateSchema as is a ObjectQuerRequest
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

    const prunedResults = await AuthorizationController.pruneResults(results.results, grants);
    return new ObjectQueryResponse(prunedResults, results.pagination.skip_token);
  }

  async handleCreateRequest(request: WriteRequest, _: PermissionGrant[]): Promise<WriteResponse> {
    PermissionsController.validateSchema(request);
    PermissionsController.validatePermissionGrant(request);

    return StoreUtils.writeCommit(request, this.context.store);
  }

  async handleDeleteRequest(request: WriteRequest, grants: PermissionGrant[]): Promise<WriteResponse> {
    PermissionsController.validateSchema(request);
    await this.validateObjectExists(request, grants);

    return StoreUtils.writeCommit(request, this.context.store);
  }

  async handleUpdateRequest(request: WriteRequest, grants: PermissionGrant[]): Promise<WriteResponse> {
    PermissionsController.validateSchema(request);
    await this.validateObjectExists(request, grants);
    PermissionsController.validatePermissionGrant(request);

    return StoreUtils.writeCommit(request, this.context.store);
  }

  // given a hub request, attempts to retrieve the PermissionGrant from it's payload
  private static getPermissionGrant(request: WriteRequest): PermissionGrant {
    const permission = request.commit.getPayload() as PermissionGrant;
    ['owner', 'grantee', 'allow', 'context', 'type'].forEach((property) => {
      if (!(permission as any)[property]) {
        throw new HubError({
          errorCode: ErrorCode.BadRequest,
          property: `commit.payload.${property}`,
          developerMessage: DeveloperMessage.MissingParameter,
        });
      } if (typeof (permission as any)[property] !== 'string') {
        throw new HubError({
          errorCode: ErrorCode.BadRequest,
          property: `commit.payload.${property}`,
          developerMessage: DeveloperMessage.IncorrectParameter,
        });
      }
    });
    return permission;
  }

  // given a hub request, validates the request contains the permission grant schema
  private static validateSchema(request: WriteRequest) {
    const headers = request.commit.getHeaders();
    if (headers.context !== PERMISSION_GRANT_CONTEXT ||
      headers.type !== PERMISSION_GRANT_TYPE) {
      throw new HubError({
        errorCode: ErrorCode.BadRequest,
      });
    }
  }

  private static validatePermissionGrant(request: WriteRequest) {
    // validates the permission
    const permission = PermissionsController.getPermissionGrant(request);

    // forbid CREATE created_by conflicts
    if (permission.created_by &&
      permission.created_by &&
      /C/.test(permission.allow)) {
      throw new HubError({
        errorCode: ErrorCode.BadRequest,
        property: 'commit.payload.created_by',
        developerMessage: 'Create permission cannot be given when created_by is used',
      });
    }
  }

  private async validateObjectExists(request: WriteRequest, grants: PermissionGrant[]) {
    if (!await StoreUtils.objectExists(request, this.context.store, grants)) {
      throw new HubError({
        errorCode: ErrorCode.NotFound,
      });
    }
  }
}
