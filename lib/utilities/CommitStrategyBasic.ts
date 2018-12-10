import Commit from '../models/Commit';
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
        nextToken: commits.pagination.skip_token === null ? undefined : commits.pagination.skip_token,
      };
    });
    if (allObjectCommits.length === 0) {
      return null;
    }
    return allObjectCommits.reduce((latestCommit, currentCommit) => {
      if (Date.parse(latestCommit.getHeaders().committed_at) < Date.parse(currentCommit.getHeaders().committed_at)) {
        return currentCommit;
      }
      return latestCommit;
    },                             allObjectCommits[0]);
  }
}
