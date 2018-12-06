import PermissionGrant, { OWNER_PERMISSION, PERMISSION_GRANT_CONTEXT, PERMISSION_GRANT_TYPE } from '../models/PermissionGrant';
import HubError, { ErrorCode, DeveloperMessage } from '../models/HubError';
import BaseRequest from '../models/BaseRequest';
import WriteRequest from '../models/WriteRequest';
import ObjectQueryRequest from '../models/ObjectQueryRequest';
import Commit, { Operation } from '../models/Commit';
import { ObjectQueryResponse } from '../interfaces/Store';
import CommitStrategyBasic from '../utilities/CommitStrategyBasic';
import ObjectContainer from '../interfaces/ObjectContainer';
import CommitQueryRequest from '../models/CommitQueryRequest';
import Context from '../interfaces/Context';

interface Pair<T, Q>  {
  first: T;
  second: Q;
}

/**
 * Internal controller for authorizing requests to an Identity Hub
 */
export default class AuthorizationController {

  /** Creates an AuthorizationController using the given Store */
  constructor (private context: Context) {
  }

  private async getPermissions(owner: string, skipToken?: string | null): Promise<ObjectQueryResponse> {
    return this.context.store.queryObjects({
      owner,
      filters: [
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
        {
          field: 'interface',
          type: 'eq',
          value: 'Permissions',
        },
      ],
      skip_token: (skipToken === null ? undefined : skipToken),
    });
  }

  /**
   * Checks if a request is authorized
   * @param request HubRequest needing authorization
   * @returns true is authorized, else false
   */
  async apiAuthorize(request: BaseRequest): Promise<PermissionGrant[]> {
    // if the request is to their own hub, always allow
    if (request.iss === request.sub) {
      return [OWNER_PERMISSION];
    }
    const requester = request.iss;
    const owner = request.sub;
    let operation: RegExp;
    let context: string;
    let type: string;
    let isCreate = false;
    switch (request.getType()) {
      case 'CommitQueryRequest':
        throw new HubError({
          errorCode: ErrorCode.ServerError,
          developerMessage: 'Commits should not call apiAuthorize',
        });
      case 'ObjectQueryRequest':
        const queryRequest = request as ObjectQueryRequest;
        operation = /R/;
        context = queryRequest.queryContext;
        type = queryRequest.queryType;
        break;
      case 'WriteRequest':
        const writeRequest = request as WriteRequest;
        const headers = writeRequest.commit.getHeaders();
        context = headers.context;
        type = headers.type;
        switch (headers.operation) {
          case Operation.Create:
            operation = /C/;
            isCreate = true;
            break;
          case Operation.Update:
            operation = /U/;
            break;
          case Operation.Delete:
            operation = /D/;
            break;
          default:
            throw new HubError({
              errorCode: ErrorCode.BadRequest,
              property: 'commit.protected.operation',
              developerMessage: DeveloperMessage.IncorrectParameter,
            });
        }
        break;
      default:
        throw new HubError({
          errorCode: ErrorCode.BadRequest,
          property: '@type',
          developerMessage: DeveloperMessage.IncorrectParameter,
        });
    }

    return this.getPermissionGrants(operation, owner, requester, [{ first: context, second: type }], isCreate);
  }

  private async getPermissionGrants(operation: RegExp,
                                    owner: string,
                                    requester: string,
                                    contextTypePairs: Pair<string, string>[],
                                    createConflictCheck: boolean = false): Promise<PermissionGrant[]> {
    const matchingGrants: PermissionGrant[] = [];
    const matchedPairs: Pair<string, string>[] = [];
    let potentialPermissions = await this.getPermissions(owner);
    do {
      for (const permissionFound of potentialPermissions.results) {
        // only handle commit strategies we understand
        if (permissionFound.commit_strategy !== 'basic') {
          continue;
        }
        const commit = await CommitStrategyBasic.resolveObject(owner, permissionFound.id, this.context.store);
        if (!commit) {
          continue;
        }
        const grant = commit.getPayload() as PermissionGrant;
        let matched = false;
        contextTypePairs.forEach((pair) => {
          if (grant.owner !== owner || // just a double check
            grant.grantee !== requester || // the permission must be granted to the requester
            grant.context !== pair.first || // context must match
            grant.type !== pair.second || // type must match
            !operation.test(grant.allow) || // the permision must grant the operation
            (createConflictCheck && grant.created_by && grant.created_by !== requester) // created_by must match requester for create commits
            ) {
            return;
          }
          if (!matchedPairs.includes(pair)) {
            matchedPairs.push(pair);
          }
          if (!matched) {
            matchingGrants.push(grant);
            matched = true;
          }
        });
      }
      if (potentialPermissions.pagination.skip_token !== null) {
        potentialPermissions = await this.getPermissions(owner, potentialPermissions.pagination.skip_token);
      }
    } while (potentialPermissions.pagination.skip_token !== null);
    contextTypePairs.forEach((pair) => {
      if (!matchedPairs.includes(pair)) {
        throw new HubError({
          errorCode: ErrorCode.PermissionsRequired,
        });
      }
    });
    return matchingGrants;
  }

  /**
   * Post-query authorization for commits to return
   * @param request CommitQueryRequest to authorize
   * @param results results of the request to authorize
   */
  async authorizeCommitRequest(request: CommitQueryRequest, results: Commit[]): Promise<PermissionGrant[]> {
    // if the request is to their own hub, always allow
    if (request.iss === request.sub) {
      return [OWNER_PERMISSION];
    }
    // REQUIRED for replication
    // TODO: if the request is from another hub, allow it
    // const document = await this.context.resolver.resolve(request.sub);
    // if (this.iss === document.didDocument.services.IdentityHubs)

    const operation = /R/;
    const contextTypePairs: Pair<string, string>[] = [];
    results.forEach((commit) => {
      const headers = commit.getHeaders();
      const pair = {
        first: headers.context,
        second: headers.type,
      };
      if (!contextTypePairs.includes(pair)) {
        contextTypePairs.push(pair);
      }
    });
    return this.getPermissionGrants(operation, request.sub, request.iss, contextTypePairs);
  }

    /**
     * Given a set of results and applicable permission grants, prunes the results to those permitted by the grants
     * @param results Object results to be pruned
     * @param grants Permission Grants used to prune the results
     * @returns A subset of results permitted by grants
     */
  static async pruneResults(results: ObjectContainer[], grants: PermissionGrant[]): Promise<ObjectContainer[]> {

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
      return results;
    }

    throw new HubError({
      errorCode: ErrorCode.PermissionsRequired,
    });

      // const prunedResults: ObjectContainer[] = [];
      // results.forEach((result) => {
      //   if (createdByRestrictions.includes(result.created_by)) {
      //     prunedResults.push(result);
      //   }
      // });
      // return prunedResults;
  }
}
