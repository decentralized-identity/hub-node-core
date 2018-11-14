import BaseResponse from './BaseResponse';

/**
 * Summarized object metadata
 */
export interface ObjectContainer {
  context: string;
  type: string;
  id: string;
  created_at: string;
  sub: string;
  commit_strategy: string;
  meta?: any;
}

/**
 * A hub response for type ObjectQueryResponse
 */
export default class ObjectQueryResponse extends BaseResponse {
  /** Results of the Object Query */
  objects: ObjectContainer[];
  /** Optional skip token to continue result returns */
  skipToken?: string;

  constructor(objects: ObjectContainer[], developerMessage?: string) {
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
