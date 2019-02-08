import { IHubResponse } from '@decentralized-identity/hub-common-js';

/**
 * A base class for Hub responses, which is extended by more specific response classes.
 */
export default abstract class BaseResponse<ResponseType extends string> {

  /** \@context of the response */
  public static readonly context = 'https://schema.identity.foundation/0.1';

  /** \@type of the response */
  protected type: ResponseType;

  /**
   * Creates a base response
   * @param developerMessage (Optional) developer message
   */
  constructor(type: ResponseType, public developerMessage?: string) {
    this.type = type;
  }

  /**
   * Forms a JSON stringified response
   */
  toString(): string {
    return JSON.stringify(this.toJson());
  }

  /**
   * Returns the JSON representation of the response
   */
  protected toJson(): IHubResponse<ResponseType> {
    return {
      '@context': BaseResponse.context,
      '@type': this.type,
      developer_message: this.developerMessage,
    };
  }
}
