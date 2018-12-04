import Context from '../interfaces/Context';
import AuthorizationController from './AuthorizationController';
import CommitQueryRequest from '../models/CommitQueryRequest';
import CommitQueryResponse from '../models/CommitQueryResponse';
import { HubError } from '../index';
import { ErrorCode } from '../models/HubError';
import * as store from '../interfaces/Store';

/**
 * Handles Commit requests for reading object data
 */
export default class CommitController {
  /**
   * Constructor for a Commit Controller.
   * @param context The context object containing all injected components
   * @param authorization An authorization controller object for authorization checks
   */
  constructor(protected context: Context, protected authorization: AuthorizationController) {}

  /**
   * Handles a CommitQueryRequest
   * @param request CommitQueryRequest to handle
   * @returns CommitQueryResponse if successful
   * @throws HubError if an error occurred
   */
  public async handle(request: CommitQueryRequest): Promise<CommitQueryResponse> {

    if (request.fields) {
      throw new HubError({
        errorCode: ErrorCode.NotImplemented,
        property: 'field',
        developerMessage: 'A new type of response is required',
      });
    }

    const filters: store.QueryEqualsFilter[] = [];
    if (request.objectIds) {
      filters.push({
        field: 'object_id',
        type: 'eq',
        value: request.objectIds,
      });
    }
    if (request.revisions) {
      filters.push({
        field: 'rev',
        type: 'eq',
        value: request.revisions,
      });
    }

    const storeRequest: store.CommitQueryRequest = {
      filters,
      owner: request.sub,
      skip_token: request.skipToken,
    };

    const response = await this.context.store.queryCommits(storeRequest);

    const grants = await this.authorization.authorizeCommitRequest(request, response.results);
    if (grants.length === 0) {
      throw new HubError({
        errorCode: ErrorCode.PermissionsRequired,
      });
    }

    return new CommitQueryResponse(response.results, response.pagination.skip_token);

    // if (request.fields) { // only metadata fields were requested, break commit signatures
    //   const filtered_results: any[] = [];
    //   response.results.forEach((commit) => {
    //     const headers: any = commit.getHeaders();
    //     const filtered_result: any = {};
    //     request.fields.forEach((property) => {
    //       filtered_result[property] = headers[property];
    //     });
    //     filtered_results.push(filtered_result);
    //   });
    // }
  }

}
