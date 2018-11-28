import BaseController from '../../lib/controllers/BaseController';
import WriteRequest from '../../lib/models/WriteRequest';
import WriteResponse from '../../lib/models/WriteResponse';
import ObjectQueryRequest from '../../lib/models/ObjectQueryRequest';
import ObjectQueryResponse from '../../lib/models/ObjectQueryResponse';
import TestContext from './TestContext';
import Context from '../../lib/interfaces/Context';

export default class TestController extends BaseController {
  handleCreateRequest(_: WriteRequest): Promise<WriteResponse> {
    throw new Error('Method not implemented.');
  }
  handleQueryRequest(_: ObjectQueryRequest): Promise<ObjectQueryResponse> {
    throw new Error('Method not implemented.');
  }
  handleDeleteRequest(_: WriteRequest): Promise<WriteResponse> {
    throw new Error('Method not implemented.');
  }
  handleUpdateRequest(_: WriteRequest): Promise<WriteResponse> {
    throw new Error('Method not implemented.');
  }
  constructor(context?: Context) {
    if (context) {
      super(context);
    } else {
      super(new TestContext());
    }
  }
}
