import Commit, { Operation } from "../../lib/models/Commit";
import Base64Url from "@decentralized-identity/did-auth-jose/lib/utilities/Base64Url";

interface TestCommitOptions {
  interface?: string;
  context?: string;
  type?: string;
  operation?: string;
  commit_strategy?: string;
  sub?: string;
  kid?: string;
  object_id?: string | string[]
}

export default class TestCommit extends Commit {

  public static create(options?: TestCommitOptions): TestCommit {
    let headers: any = Object.assign({}, options);
    ['interface', 'type', 'commit_strategy'].forEach((property) => {
      if (!headers[property]) {
        headers[property] = 'test';
      }
    });
    if (!headers.operation) {
      headers.operation = Operation.Create; // does not require additional parameters
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
    headers.committed_at = new Date(Date.now()).toISOString();
    const protectedString = Base64Url.encode(JSON.stringify(headers));
    return new TestCommit({
      protected: protectedString,
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

}