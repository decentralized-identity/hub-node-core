import BaseController from './BaseController';
import HubError, { ErrorCode } from '../models/HubError';
import PermissionGrant, { PERMISSION_GRANT_CONTEXT, PERMISSION_GRANT_TYPE } from '../models/PermissionGrant';
import ObjectQueryRequest from '../models/ObjectQueryRequest';
import ObjectQueryResponse from '../models/ObjectQueryResponse';
import WriteRequest from '../models/WriteRequest';
import WriteResponse from '../models/WriteResponse';
import StoreUtils from '../utilities/StoreUtils';
import { Operation, CommitHeaders } from '../models/Commit';

/**
 * This class handles all the permission requests.
 */
export default class PermissionsController extends BaseController {

  async handleQueryRequest(request: ObjectQueryRequest, grants: PermissionGrant[]): Promise<ObjectQueryResponse> {
    // verify context and type, not using validateSchema as is a ObjectQuerRequest
    if ((request.queryContext || request.queryType) &&
        (request.queryContext !== PERMISSION_GRANT_CONTEXT || request.queryType !== PERMISSION_GRANT_TYPE)) {
      throw new HubError({
        errorCode: ErrorCode.BadRequest,
        developerMessage: `query 'context' must be '${PERMISSION_GRANT_CONTEXT}', 'type' must be '${PERMISSION_GRANT_TYPE}'`,
      });
    }
    return super.handleQueryRequest(request, grants);
  }

  async handleWriteCommitRequest(request: WriteRequest, grants: PermissionGrant[]): Promise<WriteResponse> {
    const headers = request.commit.getProtectedHeaders();
    PermissionsController.validateSchema(headers as CommitHeaders);
    const operation = request.commit.getProtectedHeaders().operation!;
    if (operation === Operation.Create || operation === Operation.Update) {
      PermissionsController.validateStrategy(headers as CommitHeaders);
      PermissionsController.validatePermissionGrant(request);
    }
    await StoreUtils.validateObjectExists(request, this.context.store, grants);
    return StoreUtils.writeCommit(request, this.context.store);
  }

  // given a hub request, attempts to retrieve the PermissionGrant from it's payload
  private static getPermissionGrant(request: WriteRequest): PermissionGrant {
    const permission = request.commit.getPayload() as PermissionGrant;
    ['owner', 'grantee', 'allow', 'context', 'type'].forEach((property) => {
      if (!(permission as any)[property]) {
        throw HubError.missingParameter(`commit.payload.${property}`);
      }
      if (typeof (permission as any)[property] !== 'string') {
        throw HubError.incorrectParameter(`commit.payload.${property}`);
      }
    });
    return permission;
  }

  // given commit headers, validates the permission grant schema
  private static validateSchema(headers: CommitHeaders) {
    if (headers.context !== PERMISSION_GRANT_CONTEXT ||
      headers.type !== PERMISSION_GRANT_TYPE) {
      throw new HubError({
        errorCode: ErrorCode.BadRequest,
      });
    }
  }

  // given commit headers, validates the strategy
  private static validateStrategy(headers: CommitHeaders) {
    if (headers.commit_strategy !== 'basic') {
      throw new HubError({
        errorCode: ErrorCode.BadRequest,
        property: 'commit.protected.commit_strategy',
      });
    }
  }

  private static validatePermissionGrant(request: WriteRequest) {
    // validates the permission
    const permission = PermissionsController.getPermissionGrant(request);

    // forbid CREATE created_by conflicts
    if (permission.created_by &&
      /C/.test(permission.allow)) {
      throw new HubError({
        errorCode: ErrorCode.BadRequest,
        property: 'commit.payload.created_by',
        developerMessage: 'Create permission cannot be given when created_by is used',
      });
    }
  }
}
