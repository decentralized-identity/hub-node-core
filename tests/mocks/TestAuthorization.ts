import AuthorizationController from "../../lib/controllers/AuthorizationController";
import TestStore from "./TestStore";
import BaseRequest from "../../lib/models/BaseRequest";
import PermissionGrant, { OWNER_PERMISSION } from "../../lib/models/PermissionGrant";

export default class TestAuthorization extends AuthorizationController {
  constructor() {
    super(new TestStore());
  }

  async apiAuthorize(_: BaseRequest): Promise<PermissionGrant[]> {
    return [OWNER_PERMISSION];
  }

}