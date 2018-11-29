import Base64Url from '@decentralized-identity/did-auth-jose/lib/utilities/Base64Url';
import { DidDocument } from '@decentralized-identity/did-common-typescript';
import HubError, { ErrorCode, DeveloperMessage } from './HubError';
import * as crypto from 'crypto';

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
  /** original Base64Url payload */
  protected readonly originalPayload: string;
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

    if (!('payload' in jwt)) {
      throw new HubError({
        errorCode: ErrorCode.BadRequest,
        property: 'commit.payload',
        developerMessage: DeveloperMessage.MissingParameter,
      });
    }
    if (typeof jwt.payload !== 'string') {
      throw new HubError({
        errorCode: ErrorCode.BadRequest,
        property: 'commit.payload',
        developerMessage: DeveloperMessage.IncorrectParameter,
      });
    }

    this.originalPayload = jwt.payload;

    const headers = this.getProtectedHeaders();

    // check required protected headers
    ['interface', 'context', 'type', 'operation', 'committed_at', 'commit_strategy', 'sub', 'kid'].forEach((property) => {
      if (!(property in headers)) {
        throw new HubError({
          errorCode: ErrorCode.BadRequest,
          property: `commit.protected.${property}`,
          developerMessage: DeveloperMessage.MissingParameter,
        });
      }
    });

    const sha256 = crypto.createHash('sha256');
    sha256.update(`${this.originalPayload}.${this.originalPayload}`);
    const revision = sha256.digest('hex');

    switch (headers.operation) {
      case Operation.Create:
        // its impossible to include object_id as a create without the hash algorithm being broken
        if ('object_id' in headers) {
          throw new HubError({
            errorCode: ErrorCode.BadRequest,
            property: 'commit.protected.object_id',
            developerMessage: 'object_id cannot be included in the protected headers',
          });
        }
        break;
      case Operation.Update:
      case Operation.Delete:
        if (!('object_id' in headers)) {
          throw new HubError({
            errorCode: ErrorCode.BadRequest,
            property: 'commit.protected.object_id',
            developerMessage: DeveloperMessage.MissingParameter,
          });
        }
        if (typeof headers.object_id !== 'string') {
          throw new HubError({
            errorCode: ErrorCode.BadRequest,
            property: 'commit.protected.object_id',
            developerMessage: DeveloperMessage.IncorrectParameter,
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

    // rev cannot be included in the protected headers as it is part of the computation
    if ('rev' in headers) {
      if (headers.rev === revision) {
        console.warn('sha256 has been broken');
      }
      throw new HubError({
        errorCode: ErrorCode.BadRequest,
        property: 'commit.protected.rev',
        developerMessage: "'rev' cannot be included in protected headers",
      });
    }

    // copy any additional headers provided
    if ('header' in jwt) {
      for (const field in jwt.header) {
        if (!(field in headers)) {
          (headers as any)[field] = jwt.header[field];
        }
      }
    }

    // recompute/populate convinence headers
    headers.iss = DidDocument.getDidFromKeyId(headers.kid);
    headers.rev = revision;
    if (headers.operation === Operation.Create) {
      headers.object_id = revision;
    }

    this.headers = headers;
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
   * Gets the payload
   */
  getPayload(): any {
    return JSON.parse(Base64Url.decode(this.originalPayload));
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
