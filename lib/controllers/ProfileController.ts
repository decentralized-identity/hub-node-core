
import BaseController from './BaseController';
import HubError, { ErrorCode } from '../models/HubError';
import ObjectQueryRequest from '../models/ObjectQueryRequest';
import ObjectQueryResponse from '../models/ObjectQueryResponse';
import ObjectContainer from '../interfaces/ObjectContainer';
import PermissionGrant from '../models/PermissionGrant';
import WriteRequest from '../models/WriteRequest';
import WriteResponse from '../models/WriteResponse';
import StoreUtils from '../utilities/StoreUtils';
import { Operation } from '../models/Commit';
import { QueryEqualsFilter } from '../interfaces/Store';

/**
 * This class handles all the profile requests.
 */
export default class ProfileController extends BaseController {

  async handleWriteCommitRequest(request: WriteRequest, grants: PermissionGrant[]): Promise<WriteResponse> {
    const headers = request.commit.getProtectedHeaders();
    if (headers.operation === Operation.Create) {
      const profiles = await this.getProfiles(request.sub, headers.context, headers.type);
      if (profiles.length > 0) {
        throw new HubError({
          errorCode: ErrorCode.BadRequest,
          developerMessage: `Profile already exists. Please issue update for object_id: '${profiles[0].id}'`,
        });
      }
    }
    await StoreUtils.validateObjectExists(request, this.context.store, grants);
    return StoreUtils.writeCommit(request, this.context.store);
  }

  async handleQueryRequest(request: ObjectQueryRequest, _: PermissionGrant[]): Promise<ObjectQueryResponse> {
    // audiance is used here because you are allowed to read another's profile
    const profiles = await this.getProfiles(request.sub, request.queryContext, request.queryType);
    if (profiles.length === 0) {
      return new ObjectQueryResponse([], null);
    }
    if (profiles.length === 1) {
      return new ObjectQueryResponse([profiles[0]], null);
    }
    // attempt to reduce profiles to one per context/type deterministically
    const schemas: [string, string][] = [];
    const indexToObjects: {[index: number]: ObjectContainer} = {};
    profiles.forEach((profile) => {
      const schema: [string, string] = [profile.context, profile.type];
      let indexFound: number | undefined = undefined;
      // iterate through known schemas
      if (schemas.some((knownSchema, index) => {
        // if one matches, set the indexFound to the index and enter 'then' statement
        if (knownSchema[0] === schema[0] && knownSchema[1] === schema[1]) {
          indexFound = index;
          return true;
        }
        return false;
      })) { // indexFound should be defined
        if (indexFound === undefined) {
          return;
        }
        const currentProfile = indexToObjects[indexFound];
        if (profile.id < currentProfile.id) {
          indexToObjects[indexFound];
        }
      } else {
        indexFound = schemas.length;
        indexToObjects[indexFound] = profile;
        schemas.push(schema);
      }
    });

    // finalize into an array
    const results: ObjectContainer[] = [];
    for (const index in indexToObjects) {
      results.push(indexToObjects[index]);
    }

    return new ObjectQueryResponse(results, null);
  }

  // gets all the profiles on the first page for this user
  private async getProfiles(owner: string, context?: string, type?: string): Promise<ObjectContainer[]> {
    const filters: QueryEqualsFilter[] = [
      {
        field: 'interface',
        type: 'eq',
        value: 'Profile',
      } as QueryEqualsFilter,
    ];
    if (context && type) {
      filters.push({
        field: 'context',
        type: 'eq',
        value: context,
      } as QueryEqualsFilter);
      filters.push({
        field: 'type',
        type: 'eq',
        value: type,
      } as QueryEqualsFilter);
    }
    return StoreUtils.queryGetAll(async (skipToken) => {
      const pageProfiles = await this.context.store.queryObjects({
        owner,
        filters,
        skip_token: skipToken,
      });
      return {
        results: pageProfiles.results,
        nextToken: pageProfiles.pagination.skip_token,
      };
    });
  }
}
