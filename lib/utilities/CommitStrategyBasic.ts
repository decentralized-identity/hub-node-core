import Commit, { Operation } from '../models/Commit';
import { Store, CommitQueryResponse } from '../interfaces/Store';
import StoreUtils from './StoreUtils';

/**
 * Resolves objects using the 'basic' commit strategy
 * @class
 * @static
 */
export default class CommitStrategyBasic {

  private static async getCommits(owner: string, objectId: string, store: Store, skipToken?: string): Promise<CommitQueryResponse> {
    return store.queryCommits({
      owner,
      filters: [
        {
          field: 'object_id',
          type: 'eq',
          value: objectId,
        },
      ],
      skip_token: skipToken,
    });
  }

  /**
   * Given an objectId contained in the owner's store, resolves the object into the latest state. Object and all commits must use commit_strategy 'basic'
   * @param owner did of the object owner
   * @param objectId id of the object
   * @param store store in which to pull the object from
   * @returns a Commit representing the latest object, or null if not found
   */
  public static async resolveObject(owner: string, objectId: string, store: Store): Promise<Commit|null> {
    const allObjectCommits = await StoreUtils.queryGetAll(async (token?: string | null) => {
      const commits = await CommitStrategyBasic.getCommits(owner, objectId, store, token === null ? undefined : token);
      // memory optimization: reduce to only 'basic' commits while paging
      commits.results = commits.results.filter((commit: Commit) => {
        return commit.getHeaders().commit_strategy === 'basic';
      });
      return {
        results: commits.results,
        nextToken: commits.pagination.skip_token,
      };
    });
    if (allObjectCommits.length === 0) {
      return null;
    }
    return allObjectCommits.reduce((latestCommit, currentCommit) => {
      // create commits are first, any other commit has higher value
      if (latestCommit.getProtectedHeaders().operation === Operation.Create &&
          currentCommit.getProtectedHeaders().operation !== Operation.Create) {
        return currentCommit;
      }
      // delete commits are last, any other commit has lower value
      if (latestCommit.getProtectedHeaders().operation !== Operation.Delete &&
          currentCommit.getProtectedHeaders().operation === Operation.Delete) {
        return currentCommit;
      }
      // the commit is of the same type and must be decided by datetime
      const latestDate = Date.parse(latestCommit.getHeaders().committed_at);
      const currentDate = Date.parse(currentCommit.getHeaders().committed_at);
      // if the commit times are the same, defer to lexigraphical rev order
      if (latestDate === currentDate &&
          latestCommit.getHeaders().rev < currentCommit.getHeaders().rev) {
        return currentCommit;
      }
      // latest datetime wins
      if (latestDate < currentDate) {
        return currentCommit;
      }
      return latestCommit;
    },                             allObjectCommits[0]);
  }
}
