import PermissionGrant, { OWNER_PERMISSION, PERMISSION_GRANT_CONTEXT, PERMISSION_GRANT_TYPE } from '../models/PermissionGrant';
import HubError, { ErrorCode, DeveloperMessage } from '../models/HubError';
import BaseRequest from '../models/BaseRequest';
import WriteRequest from '../models/WriteRequest';
import ObjectQueryRequest from '../models/ObjectQueryRequest';
import Commit from '../models/Commit';
import { ObjectQueryResponse } from '../interfaces/Store';
import CommitStrategyBasic from '../utilities/CommitStrategyBasic';
import CommitQueryRequest from '../models/CommitQueryRequest';
import Context from '../interfaces/Context';
import { ObjectContainer } from '../index';
import StoreUtils from '../utilities/StoreUtils';

/** Operations included in Permission Grants */
export enum AuthorizationOperation {
  Create = 'create',
  Read = 'read',
  Update = 'update',
  Delete = 'delete',
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
   * Gets Permission Grants for a given request
   * @param request Hub request needing authorization. Cannot be a CommitQueryRequest. @see getPermissionGrantsForCommitQuery
   * @returns An array of permission grants found to apply to the request
   */
  async getPermissionGrantsForRequest(request: BaseRequest): Promise<PermissionGrant[]> {
    // if the request is to their own hub, always allow
    if (request.iss === request.sub) {
      return [OWNER_PERMISSION];
    }
    const requester = request.iss;
    const owner = request.sub;
    let operation: AuthorizationOperation;
    let schema: [string, string];
    switch (request.getType()) {
      case 'CommitQueryRequest':
        throw new HubError({
          errorCode: ErrorCode.ServerError,
          developerMessage: 'Commits should not call apiAuthorize',
        });
      case 'ObjectQueryRequest':
        const queryRequest = request as ObjectQueryRequest;
        schema = [queryRequest.queryContext, queryRequest.queryType];
        operation = AuthorizationOperation.Read;
        break;
      case 'WriteRequest':
        const writeRequest = request as WriteRequest;
        const headers = writeRequest.commit.getHeaders();
        schema = [headers.context, headers.type];
        operation = headers.operation.valueOf() as AuthorizationOperation;
        break;
      default:
        throw new HubError({
          errorCode: ErrorCode.BadRequest,
          property: '@type',
          developerMessage: DeveloperMessage.IncorrectParameter,
        });
    }

    return this.getPermissionGrants(operation, owner, requester, [schema]);
  }

  private static grantPermits (grant: PermissionGrant, operation: AuthorizationOperation): boolean {
    switch (operation) {
      case AuthorizationOperation.Create:
        return /C/.test(grant.allow);
      case AuthorizationOperation.Read:
        return /R/.test(grant.allow);
      case AuthorizationOperation.Update:
        return /U/.test(grant.allow);
      case AuthorizationOperation.Delete:
        return /D/.test(grant.allow);
      default:
        return false;
    }
  }

  // retrieves all permission grants for a specific did
  private async getAllPermissionGrants(owner: string): Promise<PermissionGrant[]> {
    const grantObjectIds = await StoreUtils.queryGetAll(async (token?: string | null) => {
      const grantObjects = await this.getPermissions(owner, token);
      const objects = grantObjects.results.filter((grantObject) => {
        return grantObject.commit_strategy === 'basic';
      });
      return {
        results: objects.map(fullObject => fullObject.id),
        nextToken: grantObjects.pagination.skip_token === null ? undefined : grantObjects.pagination.skip_token,
      };
    });

    const grants = await Promise.all(grantObjectIds.map(async (grantId) => {
      const commit = await CommitStrategyBasic.resolveObject(owner, grantId, this.context.store);
      if (!commit) {
        return;
      }
      return commit.getPayload() as PermissionGrant;
    }));

    return grants.filter(grant => grant !== undefined) as PermissionGrant[];
  }

  // gets all permission grants relevant to an operation
  private async getPermissionGrants(operation: AuthorizationOperation,
                                    owner: string,
                                    requester: string,
                                    contextTypePairs: [string, string][]): Promise<PermissionGrant[]> {
    const allPermissionGrants = await this.getAllPermissionGrants(owner);
    const matchedGrants = allPermissionGrants.filter((grant: PermissionGrant) => {
      if (grant.owner !== owner) {
        return false;
      }
      if (grant.grantee !== requester) {
        return false;
      }
      if (!AuthorizationController.grantPermits(grant, operation)) {
        return false;
      }
      // created_by must match requester for create commits
      if (operation === AuthorizationOperation.Create && grant.created_by && grant.created_by !== requester) {
        return false;
      }
      return contextTypePairs.some(([context, type]) => {
        return grant.context === context && grant.type === type;
      });
    });

    contextTypePairs.forEach(([context, type]) => {
      if (!matchedGrants.some((grant) => {
        return grant.context === context && grant.type === type;
      })) {
        throw new HubError({
          errorCode: ErrorCode.PermissionsRequired,
        });
      }
    });
    return matchedGrants;
  }

  /**
   * Post-query authorization for commits to return
   * @param request CommitQueryRequest to authorize
   * @param results results of the request to authorize
   */
  async getPermissionGrantsForCommitQuery(request: CommitQueryRequest, results: Commit[]): Promise<PermissionGrant[]> {
    // if the request is to their own hub, always allow
    if (request.iss === request.sub) {
      return [OWNER_PERMISSION];
    }
    // REQUIRED for replication
    // TODO: if the request is from another hub, allow it
    // const document = await this.context.resolver.resolve(request.sub);
    // if (this.iss === document.didDocument.services.IdentityHubs)

    const contextTypePairs: [string, string][] = [];
    results.forEach((commit) => {
      const headers = commit.getHeaders();
      if (!contextTypePairs.some(([context, type]) => context === headers.context && type === headers.type)) {
        contextTypePairs.push([headers.context, headers.type]);
      }
    });
    return this.getPermissionGrants(AuthorizationOperation.Read, request.sub, request.iss, contextTypePairs);
  }

    /**
     * Given a set of results and applicable permission grants, prunes the results to those permitted by the grants
     * @param results Object results to be pruned
     * @param grants Permission Grants used to prune the results
     * @returns A subset of results permitted by grants
     */
  static async pruneResults(results: ObjectContainer[], grants: PermissionGrant[]): Promise<ObjectContainer[]> {

    // check if a grant gives permission to all results
    if (grants.some(grant => !grant.created_by)) return results;

    // TODO: Give further detail in how 'created_by' functions with respect to queries. Should a query be required
    // to have a 'created_by' filter in order to allow these grants, or should we perform computations to return
    // all applicable objects at that time?

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
