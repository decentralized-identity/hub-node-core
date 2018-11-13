import BaseRequest from './BaseRequest';
import Commit from './Commit';
import HubError, { ErrorCode, DeveloperMessage } from './HubError';

/**
 * A hub request of type WriteRequest
 */
export default class WriteRequest extends BaseRequest {
  /** The commit operation sent in this request */
  commit: Commit;

  constructor(json: string | any) {
    super(json);
    this.type = 'BaseRequest';
    let request = json;
    if (typeof json === 'string') {
      request = JSON.parse(json);
    }
    if (!('commit' in request)) {
      throw new HubError({
        errorCode: ErrorCode.BadRequest,
        property: 'commit',
        developerMessage: DeveloperMessage.MissingParameter,
      });
    }
    if (typeof request.commit !== 'object') {
      throw new HubError({
        errorCode: ErrorCode.BadRequest,
        property: 'commit',
        developerMessage: DeveloperMessage.IncorrectParameter,
      });
    }
    this.commit = new Commit(request.commit);
  }
}
