import Base64Url from '@decentralized-identity/did-auth-jose/lib/utilities/Base64Url';
import { DidDocument } from '@decentralized-identity/did-common-typescript';
import HubError, { ErrorCode, DeveloperMessage } from './HubError';

/** Operations for a commit */
export enum Operation {
  Create = 'create',
  Update = 'update',
  Delete = 'delete',
}

/**
 * A single Commit to an object
 */
export default abstract class Commit {
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

    this.headers = this.getProtectedHeaders();

    // check required protected headers
    ['interface', 'context', 'type', 'operation', 'committed_at', 'commit_strategy', 'sub', 'kid'].forEach((property) => {
      if (!(property in this.headers)) {
        throw new HubError({
          errorCode: ErrorCode.BadRequest,
          property: `commit.protected.${property}`,
          developerMessage: DeveloperMessage.MissingParameter,
        });
      }
    });
    switch (this.headers.operation) {
      case Operation.Create:
        // no additional checks
        break;
      case Operation.Update:
      case Operation.Delete:
        if (!('object_id' in this.headers)) {
          throw new HubError({
            errorCode: ErrorCode.BadRequest,
            property: 'commit.protected.sub',
            developerMessage: DeveloperMessage.MissingParameter,
          });
        }
        break;
      default:
        throw new HubError({
          errorCode: ErrorCode.BadRequest,
          property: 'commit.protected.operation',
          developerMessage: DeveloperMessage.IncorrectParameter,
        });
    }
    // populate the convinence headers
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

  /**
   * Gets the protected headers
   */
  getProtectedHeaders(): any {
    return JSON.parse(Base64Url.decode(this.originalProtected));
  }

  /**
   * Gets the JSON Serialized form of this commit
   */
  abstract toJson(): any;
}

/** Combined headers for a commit */
interface CommitHeaders {
  interface: string;
  context: string;
  type: string;
  operation: Operation;
  committed_at: string;
  commit_strategy: string;
  sub: string;
  kid: string;
  meta?: any;
  iss: string;
  object_id: string;
  rev: string;
}
