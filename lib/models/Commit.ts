import Base64Url from '@decentralized-identity/did-auth-jose/lib/utilities/Base64Url';
import { DidDocument } from '@decentralized-identity/did-common-typescript';
import HubError, { ErrorCode, DeveloperMessage } from './HubError';

/**
 * A single Commit to an object
 */
export default class Commit {
  /** original Base64Url protected headers */
  protected readonly originalProtected: string;
  /** decrypted combined headers */
  protected headers: CommitHeaders;

  /**
   * Parses JSON Serialization and forms a Commit
   * @param jwt JSON Serialized commit object
   */
  constructor (jwt: any) {
    if (!('protected' in jwt)) {
      throw new HubError({
        errorCode: ErrorCode.BadRequest,
        property: 'commit.protected',
        developerMessage: DeveloperMessage.MissingParameter,
      });
    }
    if (typeof jwt.protected !== 'string') {
      throw new HubError({
        errorCode: ErrorCode.BadRequest,
        property: 'commit.protected',
        developerMessage: DeveloperMessage.IncorrectParameter,
      });
    }

    this.originalProtected = jwt.protected;

    this.headers = JSON.parse(Base64Url.decode(jwt.protected));
    this.headers['iss'] = DidDocument.getDidFromKeyId(this.headers.kid);
  }

  /**
   * Gets the combined headers for this commit
   */
  getHeaders(): CommitHeaders {
    const headers: any = {};
    for (const header in this.headers) {
      headers[header] = (this.headers as any)[header];
    }
    return headers as CommitHeaders;
  }
}

/** Operations for a commit */
enum operation {
  Create = 'create',
  Update = 'update',
  Delete = 'delete',
}

/** Combined headers for a commit */
interface CommitHeaders {
  context: string;
  type: string;
  operation: operation;
  committed_at: string;
  commit_strategy: string;
  sub: string;
  kid: string;
  meta: any;
  iss: string;
  rev: string;
}
