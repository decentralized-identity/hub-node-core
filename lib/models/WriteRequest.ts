import BaseRequest from './BaseRequest';
import Commit from './Commit';

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
      throw new Error("'commit' property required in WriteRequest");
    }
    if (typeof request.commit !== 'object') {
      throw new Error("commit' must be a JSON Serialization");
    }
    this.commit = new Commit(request.commit);
  }
}
