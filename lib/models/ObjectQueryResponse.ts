import BaseResponse from './BaseResponse';
import ObjectContainer from '../interfaces/ObjectContainer';

/**
 * A hub response for type ObjectQueryResponse
 */
export default class ObjectQueryResponse extends BaseResponse {
  /** Results of the Object Query */
  readonly objects: ObjectContainer[];
  /** Optional skip token to continue result returns */
  // readonly skipToken?: string;

  constructor(objects: ObjectContainer[], public readonly skipToken: string | null, developerMessage?: string) {
    super(developerMessage);
    this.type = 'ObjectQueryResponse';
    this.objects = objects;
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
