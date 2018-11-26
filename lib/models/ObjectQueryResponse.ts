import BaseResponse from './BaseResponse';

/**
 * Summarized object metadata
 */
export interface ObjectContainer {
  /** Interface the object exists within */
  interface: string;
  /** Context for the schema of the object */
  context: string;
  /** Schema type of the object */
  type: string;
  /** ID of the object */
  id: string;
  /** Time at which the object was created at */
  created_at: string;
  /** Subject of the object (object owner) */
  sub: string;
  /** Commit strategy used */
  commit_strategy: string;
  /** Optional latest resolved state of the meta parameter */
  meta?: any;
}

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
