import BaseResponse from './BaseResponse';
import Commit from './Commit';
import { IHubCommitQueryResponse } from '@decentralized-identity/hub-common-js';

/**
 * A hub response of type CommitQueryResponse
 */
export default class CommitQueryResponse extends BaseResponse<'CommitQueryResponse'> {

  /**
   * Creates a response for hub commit data
   * @param commits Commits data to return
   * @param skipToken skip token to include
   * @param developerMessage message to the developer
   */
  constructor (public readonly commits: Commit[], public readonly skipToken: string | null, developerMessage?: string) {
    super('CommitQueryResponse', developerMessage);
  }

  protected toJson(): IHubCommitQueryResponse {
    const jwtCommits = this.commits.map(commit => commit.toJson());
    return Object.assign({}, super.toJson(), {
      commits: jwtCommits,
      skip_token: this.skipToken,
    });
  }
}
