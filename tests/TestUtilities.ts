import { OWNER_PERMISSION } from "../lib/models/PermissionGrant";
import * as crypto from 'crypto';

export default class TestUtilities {
  static allowPermissionGrants = [OWNER_PERMISSION];
  static randomString(): string {
    return Math.round(Math.random() * Number.MAX_SAFE_INTEGER).toString(32);
  }

  static hash(content: string): string {
    const sha256 = crypto.createHash('sha256');
    sha256.update(content);
    return sha256.digest('hex');
  }
}