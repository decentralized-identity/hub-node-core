import BaseController from '../../lib/controllers/BaseController';
import WriteRequest from '../../lib/models/WriteRequest';
import WriteResponse from '../../lib/models/WriteResponse';
import ObjectQueryRequest from '../../lib/models/ObjectQueryRequest';
import ObjectQueryResponse from '../../lib/models/ObjectQueryResponse';
import TestContext from './TestContext';
import TestAuthorization from './TestAuthorization';
import Context from '../../lib/interfaces/Context';
import PermissionGrant from '../../lib/models/PermissionGrant';
import AuthorizationController from '../../lib/controllers/AuthorizationController';

export default class TestController extends BaseController {
  handleCreateRequest(_: WriteRequest, __: PermissionGrant[]): Promise<WriteResponse> {
    throw new Error('Method not implemented.');
  }
  handleQueryRequest(_: ObjectQueryRequest, __: PermissionGrant[]): Promise<ObjectQueryResponse> {
    throw new Error('Method not implemented.');
  }
  handleDeleteRequest(_: WriteRequest, __: PermissionGrant[]): Promise<WriteResponse> {
    throw new Error('Method not implemented.');
  }
  handleUpdateRequest(_: WriteRequest, __: PermissionGrant[]): Promise<WriteResponse> {
    throw new Error('Method not implemented.');
  }
  constructor(context?: Context, authorization?: AuthorizationController) {
    let useContext: Context = new TestContext();
    let useAuth: AuthorizationController = new TestAuthorization();
    if (context) {
      useContext = context;
    }
    if (authorization) {
      useAuth = authorization;
    }
    super(useContext, useAuth);
  }
}
