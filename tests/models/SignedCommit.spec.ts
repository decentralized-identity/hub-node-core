import SignedCommit from '../../lib/models/SignedCommit';
import TestCommit from '../mocks/TestCommit';
import HubError from '../../lib/models/HubError';

describe('SignedCommit', () => {
  describe('constructor', () => {
    it('should require a signature', () => {
      const commit = TestCommit.create();
      try {
        new SignedCommit({
          protected: commit.getProtectedString(),
          payload: 'sure',
        });
        fail('did not throw');
      } catch (err) {
        if (!(err instanceof HubError)) {
          fail(err);
        }
        expect(err.property).toEqual('commit.signature');
      }
      try {
        new SignedCommit({
          protected: commit.getProtectedString(),
          payload: 'sure',
          signature: true,
        });
        fail('did not throw');
      } catch (err) {
        if (!(err instanceof HubError)) {
          fail(err);
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
      });
      expect(commit).toBeDefined();
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
      });
      expect(commit).toBeDefined();
      const json = commit.toJson();
      expect(json.protected).toEqual(commitData.getProtectedString());
      expect(json.payload).toEqual(payload);
      expect(json.signature).toEqual(signature);
    });
  })
});
