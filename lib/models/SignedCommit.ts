import Commit from './Commit';
import HubError, { DeveloperMessage, ErrorCode } from './HubError';

/**
 * A JSON Serialized signed commit object
 */
export default class SignedCommit extends Commit {
  /** The original payload of the commit */
  protected readonly originalPayload: string;
  /** The original signature of the commit */
  protected readonly originalSignature: string;

  constructor(jws: any) {
    super(jws);
    ['payload', 'signature'].forEach((property) => {
      if (!(property in jws)) {
        throw new HubError({
          errorCode: ErrorCode.BadRequest,
          property: `commit.${property}`,
          developerMessage: DeveloperMessage.MissingParameter,
        });
      }
      if (typeof jws[property] !== 'string') {
        throw new HubError({
          errorCode: ErrorCode.BadRequest,
          property: `commit.${property}`,
          developerMessage: DeveloperMessage.IncorrectParameter,
        });
      }
    });

    this.originalPayload = jws.payload;
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
