import { CommitOperation } from '@decentralized-identity/hub-common-js';
import base64url from 'base64url';
import Commit from "../../lib/models/Commit";
import Context from '../../lib/interfaces/Context';

interface TestCommitOptions {
  interface?: string;
  context?: string;
  type?: string;
  operation?: string;
  commit_strategy?: string;
  sub?: string;
  kid?: string;
  object_id?: string | string[]
  committed_at?: Date
}

export default class TestCommit extends Commit {

  async validate(_: Context) {
    // do nothing
  }

  public static create(options?: TestCommitOptions, data?: any): TestCommit {
    let headers: any = Object.assign({}, options);
    ['interface', 'type', 'commit_strategy'].forEach((property) => {
      if (!headers[property]) {
        headers[property] = 'test';
      }
    });
    if (!headers.operation) {
      headers.operation = CommitOperation.Create; // does not require additional parameters
    }
    if (!headers.context) {
      headers.context = 'example.com';
    }
    if (!headers.sub) {
      headers.sub = 'did:example:alice.id';
    }
    if (!headers.kid) {
      headers.kid = 'did:example:alice.id#key-1';
    }
    if (!headers.committed_at) {
      headers.committed_at = new Date(Date.now()).toISOString();
    }

    const protectedString = base64url.encode(JSON.stringify(headers));
    const jsonData = data ? data : { test: 'data' }
    return new TestCommit({
      protected: protectedString,
      payload: base64url.encode(JSON.stringify(jsonData))
    });
  }

  private constructor(jwt: any) {
    super(jwt);
  }

  toJson() {
    return {
      protected: this.originalProtected
    }
  }

  getProtectedString(): string {
    return this.originalProtected;
  }

  getPayloadString(): string {
    return this.originalPayload;
  }

}