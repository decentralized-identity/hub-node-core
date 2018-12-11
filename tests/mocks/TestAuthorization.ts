import AuthorizationController from "../../lib/controllers/AuthorizationController";
import BaseRequest from "../../lib/models/BaseRequest";
import PermissionGrant, { OWNER_PERMISSION } from "../../lib/models/PermissionGrant";
import TestContext from "./TestContext";
import CommitQueryRequest from "../../lib/models/CommitQueryRequest";
import { Commit } from "../../lib";

export default class TestAuthorization extends AuthorizationController {
  constructor() {
    super(new TestContext());
  }

  async getPermissionGrantsForRequest(_: BaseRequest): Promise<PermissionGrant[]> {
    return [OWNER_PERMISSION];
  }

  async getPermissionGrantsForCommitQuery(_: CommitQueryRequest, __: Commit[]): Promise<PermissionGrant[]> {
    return [OWNER_PERMISSION];
  }
}