import { IHubObjectQueryResponse, IObjectMetadata } from '@decentralized-identity/hub-common-js';
import BaseResponse from './BaseResponse';

/**
 * A hub response for type ObjectQueryResponse
 */
export default class ObjectQueryResponse extends BaseResponse<'ObjectQueryResponse'> {

  /**
   * Creates a response for a hub object query
   * @param objects Object metadata to return
   * @param skipToken skip token to include
   * @param developerMessage message to the developer
   */
  constructor(public readonly objects: IObjectMetadata[], public readonly skipToken: string | null, developerMessage?: string) {
    super('ObjectQueryResponse', developerMessage);
  }

  protected toJson(): IHubObjectQueryResponse {
    return Object.assign({}, super.toJson(), {
      objects: this.objects,
      skip_token: this.skipToken,
    });
  }
}
