
import BaseController from './BaseController';
import HubError, { ErrorCode } from '../models/HubError';
import ObjectQueryRequest from '../models/ObjectQueryRequest';
import ObjectQueryResponse from '../models/ObjectQueryResponse';
import ObjectContainer from '../interfaces/ObjectContainer';
import PermissionGrant from '../models/PermissionGrant';
import WriteRequest from '../models/WriteRequest';
import WriteResponse from '../models/WriteResponse';
import StoreUtils from '../utilities/StoreUtils';

export const PROFILE_CONTEXT = 'schema.identity.foundation/0.1';
export const PROFILE_TYPE = 'Profile';

/**
 * This class handles all the profile requests.
 */
export default class ProfileController extends BaseController {
  async handleQueryRequest(request: ObjectQueryRequest, _: PermissionGrant[]): Promise<ObjectQueryResponse> {
    // audiance is used here because you are allowed to read another's profile
    const profiles = await this.getProfiles(request.sub);
    if (profiles.length > 0) {
      return new ObjectQueryResponse([profiles[0]], null);
    }
    return new ObjectQueryResponse([], null);
  }

  async handleCreateRequest(request: WriteRequest, _: PermissionGrant[]): Promise<WriteResponse> {
    ProfileController.validateSchema(request);
    const profiles = await this.getProfiles(request.sub);
    if (profiles.length > 0) {
      throw new HubError({
        errorCode: ErrorCode.BadRequest,
        developerMessage: `Profile already exists. Please issue update for object_id: '${profiles[0].id}'`,
      });
    }

    return await StoreUtils.writeCommit(request, this.context.store);
  }

  async handleDeleteRequest(request: WriteRequest, grants: PermissionGrant[]): Promise<WriteResponse> {
    ProfileController.validateSchema(request);
    if (!await StoreUtils.objectExists(request, this.context.store, grants)) {
      throw new HubError({
        errorCode: ErrorCode.NotFound,
      });
    }

    return StoreUtils.writeCommit(request, this.context.store);
  }

  async handleUpdateRequest(request: WriteRequest, grants: PermissionGrant[]): Promise<WriteResponse> {
    ProfileController.validateSchema(request);
    if (!await StoreUtils.objectExists(request, this.context.store, grants)) {
      throw new HubError({
        errorCode: ErrorCode.NotFound,
      });
    }

    // we cannot help if they already have multiple profiles
    return StoreUtils.writeCommit(request, this.context.store);
  }

  // gets all the profiles on the first page for this user
  private async getProfiles(owner: string): Promise<ObjectContainer[]> {
    const profiles = await this.context.store.queryObjects({
      owner,
      filters: [
        {
          field: 'interface',
          type: 'eq',
          value: 'Profile',
        },
        {
          field: 'context',
          type: 'eq',
          value: PROFILE_CONTEXT,
        },
        {
          field: 'type',
          type: 'eq',
          value: PROFILE_TYPE,
        },
      ],
    });
    return profiles.results;
  }

  // given a hub request, validates the request contains the permission grant schema
  private static validateSchema(request: WriteRequest) {
    const headers = request.commit.getHeaders();
    if (headers.context !== PROFILE_CONTEXT ||
      headers.type !== PROFILE_TYPE) {
      throw new HubError({
        errorCode: ErrorCode.BadRequest,
      });
    }
  }
}
