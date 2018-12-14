import SignedCommit from '../../lib/models/SignedCommit';
import TestCommit from '../mocks/TestCommit';
import HubError, { ErrorCode } from '../../lib/models/HubError';
import TestContext from '../mocks/TestContext';
import { DidDocument } from '@decentralized-identity/did-common-typescript';
import TestUtilities from '../TestUtilities';
import RsaPrivateKey from '@decentralized-identity/did-auth-jose/dist/lib/crypto/rsa/RsaPrivateKey';
import { JwsToken, CryptoFactory, RsaCryptoSuite } from '@decentralized-identity/did-auth-jose';

describe('SignedCommit', () => {
  const context = new TestContext();
  describe('constructor', () => {
    it('should require a signature', () => {
      const commit = TestCommit.create();
      try {
        new SignedCommit({
          protected: commit.getProtectedString(),
          payload: 'sure',
        }, context);
        fail('did not throw');
      } catch (err) {
        if (!(err instanceof HubError)) {
          fail(err.message);
        }
        expect(err.property).toEqual('commit.signature');
      }
      try {
        new SignedCommit({
          protected: commit.getProtectedString(),
          payload: 'sure',
          signature: true,
        }, context);
        fail('did not throw');
      } catch (err) {
        if (!(err instanceof HubError)) {
          fail(err.message);
        }
        expect(err.property).toEqual('commit.signature');
      }
    });

    it('should create', () => {
      const commitData = TestCommit.create();
      const commit = new SignedCommit({
        protected: commitData.getProtectedString(),
        payload: 'yup',
        signature: 'sure',
      }, context);
      expect(commit).toBeDefined();
    });
  });

  describe('validate', () => {
    it('should validate a correct Signed Commit', async () => {
      const privateKey = await RsaPrivateKey.generatePrivateKey('did:example:alice.id#key-1');
      const commitData = TestCommit.create(undefined, {
        test: TestUtilities.randomString()
      });
      spyOn(context.resolver, 'resolve').and.returnValue({
        didDocument: new DidDocument({
          id: 'did:example:alice.id',
          '@context': 'example.com',
          publicKey: [
            {
              id: privateKey.kid,
              type: 'RsaVerificationKey2018',
              owner: 'did:example:alice.id',
              publicKeyJwk: privateKey.getPublicKey()
            }
          ],
        })
      });
      context.cryptoSuites = [new RsaCryptoSuite()];
      const factory = new CryptoFactory(context.cryptoSuites);
      delete SignedCommit['cryptoFactory'];
      delete SignedCommit['resolver'];
      const token = new JwsToken(commitData.getPayloadString(), factory);
      const compactjws = await token.sign(privateKey, commitData.getProtectedHeaders() as any);
      const parts = compactjws.split('.');
      const commit = new SignedCommit({
        protected: parts[0],
        payload: parts[1],
        signature: parts[2],
      }, context);
      expect(async () => {await commit.validate()}).not.toThrow();
    })

    it('should throw if no public key is found', async () => {
      const privateKey = await RsaPrivateKey.generatePrivateKey('did:example:alice.id#key-1');
      const commitData = TestCommit.create(undefined, {
        test: TestUtilities.randomString()
      });
      spyOn(context.resolver, 'resolve').and.returnValue({
        didDocument: new DidDocument({
          id: 'did:example:alice.id',
          '@context': 'example.com',
          publicKey: [
            {
              id: privateKey.kid + 'a',
              type: 'RsaVerificationKey2018',
              owner: 'did:example:alice.id',
              publicKeyJwk: privateKey.getPublicKey()
            }
          ],
        })
      });
      context.cryptoSuites = [new RsaCryptoSuite()];
      const factory = new CryptoFactory(context.cryptoSuites);
      delete SignedCommit['cryptoFactory'];
      delete SignedCommit['resolver'];
      const token = new JwsToken(commitData.getPayloadString(), factory);
      const compactjws = await token.sign(privateKey, commitData.getProtectedHeaders() as any);
      const parts = compactjws.split('.');
      const commit = new SignedCommit({
        protected: parts[0],
        payload: parts[1],
        signature: parts[2],
      }, context);
      try {
        await commit.validate();
        fail('Expected to throw');
      } catch (err) {
        if (!(err instanceof HubError)) {
          fail(err.message);
        }
        expect(err.errorCode).toEqual(ErrorCode.BadRequest);
        expect(err.property).toEqual('commit');
        expect(err.developerMessage.toLowerCase()).toContain('public key');
      }
    });

    it('should throw for invalid signatures', async () => {
      const privateKey = await RsaPrivateKey.generatePrivateKey('did:example:alice.id#key-1');
      const commitData = TestCommit.create(undefined, {
        test: TestUtilities.randomString()
      });
      spyOn(context.resolver, 'resolve').and.returnValue({
        didDocument: new DidDocument({
          id: 'did:example:alice.id',
          '@context': 'example.com',
          publicKey: [
            {
              id: privateKey.kid,
              type: 'RsaVerificationKey2018',
              owner: 'did:example:alice.id',
              publicKeyJwk: privateKey.getPublicKey()
            }
          ],
        })
      });
      context.cryptoSuites = [new RsaCryptoSuite()];
      const factory = new CryptoFactory(context.cryptoSuites);
      delete SignedCommit['cryptoFactory'];
      delete SignedCommit['resolver'];
      const token = new JwsToken(commitData.getPayloadString(), factory);
      const compactjws = await token.sign(privateKey, commitData.getProtectedHeaders() as any);
      const parts = compactjws.split('.');
      const commit = new SignedCommit({
        protected: parts[0],
        payload: parts[1],
        signature: parts[2] + 'yeah-Nope',
      }, context);
      try {
        await commit.validate();
        fail('did not throw');
      } catch (err) {
        expect(err).toBeDefined();
      }
    });
  });

  describe('toString', () => {
    it('should generate the original base64', () => {
      const commitData = TestCommit.create();
      const payload = Math.round(Math.random() * Number.MAX_SAFE_INTEGER).toString(32);
      const signature = Math.round(Math.random() * Number.MAX_SAFE_INTEGER).toString(32);
      const commit = new SignedCommit({
        payload,
        signature,
        protected: commitData.getProtectedString(),
      }, context);
      expect(commit).toBeDefined();
      const json = commit.toJson();
      expect(json.protected).toEqual(commitData.getProtectedString());
      expect(json.payload).toEqual(payload);
      expect(json.signature).toEqual(signature);
    });
  })
});
