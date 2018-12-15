import BaseRequest from './BaseRequest';
import Commit from './Commit';
import HubError, { ErrorCode } from './HubError';
import SignedCommit from './SignedCommit';
import Context from '../interfaces/Context';
import { DidDocument } from '@decentralized-identity/did-common-typescript';

/**
 * A hub request of type WriteRequest
 */
export default class WriteRequest extends BaseRequest {
  /** The commit operation sent in this request */
  commit: Commit;

  constructor(json: string | any, context: Context) {
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
    this.commit = new SignedCommit(request.commit, context);

    if (this.iss !== DidDocument.getDidFromKeyId(this.commit.getProtectedHeaders().kid!)) {
      throw new HubError({
        errorCode: ErrorCode.BadRequest,
        property: 'commit',
        developerMessage: 'The commit must be signed by the request issuer',
      })
    }
  }
}
