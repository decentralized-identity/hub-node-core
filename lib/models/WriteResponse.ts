import BaseResponse from './BaseResponse';

/**
 * A hub response of type WriteResponse
 */
export default class WriteResponse extends BaseResponse<'WriteResponse'> {
  constructor(public readonly revisions: string[], developerMessage?: string) {
    super('WriteResponse', developerMessage);
  }

  protected toJson(): any {
    return Object.assign({}, super.toJson(), {
      revisions: this.revisions,
    });
  }
}
