import { OWNER_PERMISSION } from "../lib/models/PermissionGrant";

export default class TestUtilities {
  static allowPermissionGrants = [OWNER_PERMISSION];
  static randomString(): string {
    return Math.round(Math.random() * Number.MAX_SAFE_INTEGER).toString(32);
  }

}