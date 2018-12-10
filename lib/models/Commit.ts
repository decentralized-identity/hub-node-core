import base64url from 'base64url';
import { DidDocument } from '@decentralized-identity/did-common-typescript';
import HubError, { ErrorCode } from './HubError';
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
      throw HubError.missingParameter('commit.protected');
    }
    if (typeof jwt.protected !== 'string') {
      throw HubError.incorrectParameter('commit.protected');
    }

    this.originalProtected = jwt.protected;

    if (!('payload' in jwt)) {
      throw HubError.missingParameter('commit.payload');
    }
    if (typeof jwt.payload !== 'string') {
      throw HubError.incorrectParameter('commit.payload');
    }

    this.originalPayload = jwt.payload;

    const protectedHeaders = this.getProtectedHeaders();

    // check required protected headers
    ['interface', 'context', 'type', 'operation', 'committed_at', 'commit_strategy', 'sub', 'kid'].forEach((property) => {
      if (!(property in protectedHeaders)) {
        throw HubError.missingParameter(`commit.protected.${property}`);
      }
    });

    const sha256 = crypto.createHash('sha256');
    sha256.update(`${this.originalProtected}.${this.originalPayload}`);
    const revision = sha256.digest('hex');

    switch (protectedHeaders.operation) {
      case Operation.Create:
        // its impossible to include object_id as a create without the hash algorithm being broken
        if ('object_id' in protectedHeaders) {
          throw new HubError({
            errorCode: ErrorCode.BadRequest,
            property: 'commit.protected.object_id',
            developerMessage: 'object_id cannot be included in the protected headers for a \'create\' commit',
          });
        }
        break;
      case Operation.Update:
      case Operation.Delete:
        if (!('object_id' in protectedHeaders)) {
          throw HubError.missingParameter('commit.protected.object_id');
        }
        if (typeof protectedHeaders.object_id !== 'string') {
          throw HubError.incorrectParameter('commit.protected.object_id');
        }
        break;
      default:
        throw HubError.incorrectParameter('commit.protected.operation');
    }

    // rev cannot be included in the protected headers as it is part of the computation
    if ('rev' in protectedHeaders) {
      if (protectedHeaders.rev === revision) {
        console.warn('sha256 has been broken');
      }
      throw new HubError({
        errorCode: ErrorCode.BadRequest,
        property: 'commit.protected.rev',
        developerMessage: "'rev' cannot be included in protected headers",
      });
    }

    // copy any additional headers provided
    let combinedHeaders: any = {};
    if ('header' in jwt) {
      combinedHeaders = Object.assign(combinedHeaders, jwt.header);
    }
    combinedHeaders = Object.assign(combinedHeaders, protectedHeaders);

    // recompute/populate convinence headers
    combinedHeaders.iss = DidDocument.getDidFromKeyId(combinedHeaders.kid);
    combinedHeaders.rev = revision;
    if (combinedHeaders.operation === Operation.Create) {
      combinedHeaders.object_id = revision;
    }

    this.headers = combinedHeaders;
  }

  /**
   * Gets the combined headers for this commit
   */
  getHeaders(): CommitHeaders {
    return Object.assign({}, this.headers);
  }

  /**
   * Gets the protected headers
   */
  getProtectedHeaders(): any {
    return JSON.parse(base64url.decode(this.originalProtected));
  }

  /**
   * Gets the payload
   */
  getPayload(): any {
    return JSON.parse(base64url.decode(this.originalPayload));
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
