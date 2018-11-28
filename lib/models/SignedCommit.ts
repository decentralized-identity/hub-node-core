import Commit from './Commit';
import HubError, { DeveloperMessage, ErrorCode } from './HubError';

/**
 * A JSON Serialized signed commit object
 */
export default class SignedCommit extends Commit {
  /** The original signature of the commit */
  protected readonly originalSignature: string;

  constructor(jws: any) {
    super(jws);

    if (!('signature' in jws)) {
      throw new HubError({
        errorCode: ErrorCode.BadRequest,
        property: 'commit.signature',
        developerMessage: DeveloperMessage.MissingParameter,
      });
    }
    if (typeof jws.signature !== 'string') {
      throw new HubError({
        errorCode: ErrorCode.BadRequest,
        property: `commit.signature`,
        developerMessage: DeveloperMessage.IncorrectParameter,
      });
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
    const additionalHeaders = this.getHeaders();
    const protectedHeaders = this.getProtectedHeaders();
    for (const key in protectedHeaders) {
      delete (additionalHeaders as any)[key];
    }
    return {
      protected: this.originalProtected,
      headers: additionalHeaders,
      payload: this.originalPayload,
      signature: this.originalSignature,
    } as any;
  }
}
