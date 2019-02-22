import BaseResponse from '../../lib/models/BaseResponse';

export default class TestResponse extends BaseResponse<'TestResponse'> {
  constructor(developerMessage?: string) {
    super('TestResponse', developerMessage);
  }
}
