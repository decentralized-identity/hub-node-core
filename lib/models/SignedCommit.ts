import { HubErrorCode } from '@decentralized-identity/hub-common-js';
import Commit from './Commit';
import HubError from './HubError';
import Context from '../interfaces/Context';
import { DidResolver, DidDocument } from '@decentralized-identity/did-common-typescript';
import { CryptoFactory, JwsToken } from '@decentralized-identity/did-auth-jose';

/**
 * A JSON Serialized signed commit object
 */
export default class SignedCommit extends Commit {
  /** The original signature of the commit */
  protected readonly originalSignature: string;
  /** Singleton universal resolver */
  protected static resolver: DidResolver;
  /** Singleton cryptoFactory */
  protected static cryptoFactory: CryptoFactory;

  constructor(jws: any) {
    super(jws);

    if (!('signature' in jws)) {
      throw HubError.missingParameter('commit.signature');
    }
    if (typeof jws.signature !== 'string') {
      throw HubError.incorrectParameter('commit.signature');
    }

    this.originalSignature = jws.signature;
  }

  /**
   * Validates the signature of the commit
   */
  async validate(context: Context) {
    // singleton initializer
    if (!SignedCommit.resolver) {
      SignedCommit.resolver = context.resolver;
    }
    if (!SignedCommit.cryptoFactory) {
      SignedCommit.cryptoFactory = new CryptoFactory(context.cryptoSuites);
    }
    const content = `${this.originalProtected}.${this.originalPayload}.${this.originalSignature}`;
    const token = new JwsToken(content, SignedCommit.cryptoFactory);
    const keyId = token.getHeader().kid;
    const senderDID = DidDocument.getDidFromKeyId(keyId);
    const senderDDO = await SignedCommit.resolver.resolve(senderDID);
    const publicKey = senderDDO.didDocument.getPublicKey(keyId);
    if (!publicKey) {
      throw new HubError({
        errorCode: HubErrorCode.BadRequest,
        property: 'commit',
        developerMessage: `Public Key ${keyId} could not be found`,
      });
    }
    const jwkPublicKey = SignedCommit.cryptoFactory.constructPublicKey(publicKey);
    await token.verifySignature(jwkPublicKey);
  }

  toJson() {
    return {
      protected: this.originalProtected,
      header: this.unprotectedHeaders,
      payload: this.originalPayload,
      signature: this.originalSignature,
    } as any;
  }
}
