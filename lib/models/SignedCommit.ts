import Commit from './Commit';

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
        throw new Error(`'${property} property in commits required`);
      }
      if (typeof jws[property] !== 'string') {
        throw new Error(`'${property}' property in commits must be a Base64Url string`);
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
}
