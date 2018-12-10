import BaseRequest from './BaseRequest';
import Commit f
rom './Commit';
import HubError from './HubError';
import SignedCommit from './SignedCommit';

/**
 * A hub request of type WriteRequest
 */
export default class WriteRequest extends BaseRequest {
  /** The commit operation sent in this request */
  commit: Commit;

  constructor(json: string | any) {
    super(json);
    this.type = 'WriteRequest';
    let request = json;
    if (typeof json === 'string') {
      request = JSON.parse(json);
    }
    if (!('commit' in request)) {
      throw HubError.missingParameter('commit');
    }
    if (typeof request.commit !== 'object') {
      throw HubError.incorrectParameter('commit');
    }
    this.commit = new SignedCommit(request.commit);
  }
}
