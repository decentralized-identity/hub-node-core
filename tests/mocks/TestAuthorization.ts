import AuthorizationController from "../../lib/controllers/AuthorizationController";
import BaseRequest from "../../lib/models/BaseRequest";
import PermissionGrant, { OWNER_PERMISSION } from "../../lib/models/PermissionGrant";
import TestContext from "./TestContext";

export default class TestAuthorization extends AuthorizationController {
  constructor() {
    super(new TestContext());
  }

  async apiAuthorize(_: BaseRequest): Promise<PermissionGrant[]> {
    return [OWNER_PERMISSION];
  }

}