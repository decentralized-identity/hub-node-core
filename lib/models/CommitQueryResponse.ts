import BaseResponse from './BaseResponse';
import Commit from './Commit';

/**
 * A hub response of type CommitQueryResponse
 */
export default class CommitQueryResponse extends BaseResponse {

  /**
   * Creates a response for hub commit data
   * @param commits Commits data to return
   * @param skipToken skip token to include
   * @param developerMessage message to the developer
   */
  constructor (public readonly commits: Commit[], public readonly skipToken: string | null, developerMessage?: string) {
    super(developerMessage);
    this.type = 'CommitQueryResponse';
  }

  protected toJson(): any {
    const jwtCommits = this.commits.map(commit => commit.toJson());
    const json = super.toJson();
    Object.assign(json, {
      commits: jwtCommits,
      skip_token: this.skipToken,
    });
    return json;
  }
}
