import BaseController from '../../lib/controllers/BaseController';
import WriteRequest from '../../lib/models/WriteRequest';
import WriteResponse from '../../lib/models/WriteResponse';
import ObjectQueryRequest from '../../lib/models/ObjectQueryRequest';
import ObjectQueryResponse from '../../lib/models/ObjectQueryResponse';
import Context from '../../lib/interfaces/Context';

export default class TestController extends BaseController {
  handleCreateRequest(request: WriteRequest): Promise<WriteResponse> {
    throw new Error('Method not implemented.');
  }
  handleQueryRequest(request: ObjectQueryRequest): Promise<ObjectQueryResponse> {
    throw new Error('Method not implemented.');
  }
  handleDeleteRequest(request: WriteRequest): Promise<WriteResponse> {
    throw new Error('Method not implemented.');
  }
  handleUpdateRequest(request: WriteRequest): Promise<WriteResponse> {
    throw new Error('Method not implemented.');
  }
  constructor() {
    const context: Context = {
    };
    super(context);
  }
}
