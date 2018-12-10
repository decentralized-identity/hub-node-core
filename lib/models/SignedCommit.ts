import Commit from './Commit';
import HubError from './HubError';

/**
 * A JSON Serialized signed commit object
 */
export default class SignedCommit extends Commit {
  /** The original signature of the commit */
  protected readonly originalSignature: string;

  constructor(jws: any) {
    super(jws);

    if (!('signature' in jws)) {
      throw HubError.missingParameter('commit.signature');
    }
    if (typeof jws.signature !== 'string') {
      throw HubError.incorrectParameter('commit.signature');
    }

    this.originalSignature = jws.signature;

    this.validate();
  }

  /**
   * Validates the signature of the commit
   */
  validate() {
  }

  toJson() {
    return {
      protected: this.originalProtected,
      header: this.unprotectedHeaders,
      payload: this.originalPayload,
      signature: this.originalSignature,
    } as any;
  }
}
