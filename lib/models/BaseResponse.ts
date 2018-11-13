
/**
 * A hub response of type BaseResponse
 */
export default class BaseResponse {
  /** \@context of the response */
  readonly context = 'https://schema.identity.foundation/0.1';
  /** \@type of the response */
  protected type = 'BaseResponse';

  /**
   * Creates a base response
   * @param developerMessage optional developer message
   */
  constructor(public developerMessage?: string) {
  }

  /** Forms a JSON stringified response */
  toString(): string {
    return JSON.stringify(this.toJson());
  }

  /**
   * Returns the JSON representation of the response
   */
  protected toJson(): any {
    return {
      '@context': this.context,
      '@type': this.type,
      developer_message: this.developerMessage,
    };
  }
}
