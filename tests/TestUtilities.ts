import { OWNER_PERMISSION } from "../lib/models/PermissionGrant";
import * as crypto from 'crypto';
import { Commit, SignedCommit } from "../lib";
import { PrivateKey, CryptoFactory, RsaCryptoSuite, JwsToken } from "@decentralized-identity/did-auth-jose";

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

  static async toSignedCommit(commit: Commit, privateKey: PrivateKey): Promise<SignedCommit> {
    const registry = new CryptoFactory([new RsaCryptoSuite()]);
    const jws = new JwsToken(commit.getPayload(), registry);
    const signature = await jws.sign(privateKey, commit.getProtectedHeaders() as any);
    const parts = signature.split('.');
    return new SignedCommit({
      protected: parts[0],
      payload: parts[1],
      signature: parts[2]
    });
  }
}