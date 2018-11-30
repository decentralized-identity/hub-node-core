import Commit from '../models/Commit';
import { Store, CommitQueryResponse } from '../interfaces/Store';

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
    let latestCommit: Commit | null = null;
    let latestDate: Date;
    const returnedCommits = await CommitStrategyBasic.getCommits(owner, objectId, store);
    do {
      returnedCommits.results.forEach((permissionCommit) => {
        const headers = permissionCommit.getHeaders();
        if (headers.commit_strategy !== 'basic') {
          return;
        }
        const date = new Date(headers.committed_at);
        if (!latestCommit || !latestDate || latestDate < date) {
          latestCommit = permissionCommit;
          latestDate = date;
        }
      });
    } while (returnedCommits.pagination.skip_token !== null);
    return latestCommit;
  }
}
