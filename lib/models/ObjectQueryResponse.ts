import BaseResponse from './BaseResponse';
import ObjectContainer from '../interfaces/ObjectContainer';

/**
 * A hub response for type ObjectQueryResponse
 */
export default class ObjectQueryResponse extends BaseResponse {

  /**
   * Creates a response for a hub object query
   * @param objects Object metadata to return
   * @param skipToken skip token to include
   * @param developerMessage message to the developer
   */
  constructor(public readonly objects: ObjectContainer[], public readonly skipToken: string | null, developerMessage?: string) {
    super(developerMessage);
    this.type = 'ObjectQueryResponse';
  }

  protected toJson(): any {
    const json = super.toJson();
    Object.assign(json, {
      objects: this.objects,
      skip_token: this.skipToken,
    });
    return json;
  }
}
