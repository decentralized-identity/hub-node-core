import { Store, QueryEqualsFilter } from '../interfaces/Store';
import PermissionGrant from '../models/PermissionGrant';
import WriteRequest from '../models/WriteRequest';
import HubError, { ErrorCode } from '../models/HubError';
import WriteResponse from '../models/WriteResponse';

/**
 * Utilities for interacting with the Storage layer (Store)
 */
export default class StoreUtils {
  /**
   * Checks if the object referenced by the WriteRequest exists and is permitted
   * @param request WriteRequest with commit of object to check for. object_id MUST be defined in commit.
   * @param store Store to check in for object
   * @param grants PermissionGrants to check against
   * @returns True if the object exists, false otherwise
   * @throws PermissionRequired if the object exists but no grant permits its use
   */
  public static async objectExists(request: WriteRequest, store: Store, grants?: PermissionGrant[]): Promise<boolean> {
    const commitHeaders = request.commit.getProtectedHeaders();
    const filters: QueryEqualsFilter[] = [
      {
        field: 'interface',
        value: commitHeaders.interface!,
        type: 'eq',
      },
      {
        field: 'object_id',
        value: [commitHeaders.object_id!],
        type: 'eq',
      },
      {
        field: 'context',
        value: commitHeaders.context!,
        type: 'eq',
      },
      {
        field: 'type',
        value: commitHeaders.type!,
        type: 'eq',
      },
    ];

    const queryRequest = {
      filters,
      owner: commitHeaders.sub!,
    };

    const response = await store.queryObjects(queryRequest);

    if (response.results.length > 1) {
      throw new HubError({
        errorCode: ErrorCode.ServerError,
      });
    } else if (response.results.length === 1 && grants) {
      let authorized = false;
      grants.forEach((grant) => {
        if ((!grant.created_by) ||
          (response.results[0].created_by === grant.created_by)) {
          authorized = true;
        }
      });
      if (!authorized) {
        throw new HubError({
          errorCode: ErrorCode.PermissionsRequired,
        });
      }
    }

    return response.results.length > 0;
  }

  /**
   * Given a WriteRequest, writes the commit to store and returns the WriteResponse
   * @param request WriteRequest to submit to Store
   * @param store Store to write the WriteRequest into
   * @returns WriteResponse from Store
   */
  public static async writeCommit(request: WriteRequest, store: Store): Promise<WriteResponse> {
    const commitRequest = {
      owner: request.sub,
      commit: request.commit,
    };
    const response = await store.commit(commitRequest);
    return new WriteResponse(response.knownRevisions);
  }

  /**
   * Helper function to collect all results from a paged query by iterating through results.
   *
   * @param callback A callback which should execute the next iteration of the query based on a
   * continuation token passed as the first parameter.
   */
  static async queryGetAll<ResultType> (
    callback: (nextToken?: any) => Promise<{results: ResultType[], nextToken: any}>): Promise<ResultType[]> {
    let nextToken: string | undefined = undefined;
    let allResults: ResultType[] = [];

    do {
      let results: ResultType[];
      ({ results, nextToken } = await callback(nextToken));
      allResults = allResults.concat(results);
    } while (nextToken);

    return allResults;
  }
}
