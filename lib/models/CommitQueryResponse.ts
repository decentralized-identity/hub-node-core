import BaseResponse from './BaseResponse';
import Commit from './Commit';

/**
 * A hub response of type CommitQueryResponse
 */
export default class CommitQueryResponse extends BaseResponse {

  constructor (public readonly commits: Commit[], public readonly skipToken: string | null, developerMessage?: string) {
    super(developerMessage);
    this.type = 'CommitQueryResponse';
  }

  protected toJson(): any {
    const jwtCommits: any[] = [];
    this.commits.forEach((commit) => {
      jwtCommits.push(commit.toJson());
    });
    const json = super.toJson();
    Object.assign(json, {
      commits: jwtCommits,
      skip_token: this.skipToken,
    });
    return json;
  }
}
