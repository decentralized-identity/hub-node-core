import BaseController from '../../lib/controllers/BaseController';
import WriteRequest from '../../lib/models/WriteRequest';
import WriteResponse from '../../lib/models/WriteResponse';
import TestContext from './TestContext';
import TestAuthorization from './TestAuthorization';
import Context from '../../lib/interfaces/Context';
import PermissionGrant from '../../lib/models/PermissionGrant';
import AuthorizationController from '../../lib/controllers/AuthorizationController';

export default class TestController extends BaseController {
  handleWriteCommitRequest(_: WriteRequest, __: PermissionGrant[]): Promise<WriteResponse> {
    throw new Error("Method not implemented.");
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
