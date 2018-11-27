import WriteRequest from '../../lib/models/WriteRequest';
import { Context } from './BaseRequest.spec';
import HubError from '../../lib/models/HubError';
import TestCommit from '../mocks/TestCommit';
import SignedCommit from '../../lib/models/SignedCommit';

describe('WriteRequest', () => {
  describe('constructor', () => {
    it('should require a commit', () => {
      try {
        new WriteRequest({
          '@context': Context,
          '@type': 'WriteRequest',
          iss: 'did:example:alice.id',
          aud: 'did:example:hub.id',
          sub: 'did:example:alice.id',
        });
        fail('did not throw');
      } catch (err) {
        if (!(err instanceof HubError)) {
          fail(err.message);
        }
        expect(err.property).toEqual('commit');
      }
    });

    it('should require commit to be an object', () => {
      try {
        new WriteRequest({
          '@context': Context,
          '@type': 'WriteRequest',
          iss: 'did:example:alice.id',
          aud: 'did:example:hub.id',
          sub: 'did:example:alice.id',
          commit: 'I am an object, believe me.',
        });
        fail('did not throw');
      } catch (err) {
        if (!(err instanceof HubError)) {
          fail(err.message);
        }
        expect(err.property).toEqual('commit');
      }
    });

    it('should convert from string to JSON', () => {
      const commit = TestCommit.create();
      const requestData = {
        '@context': Context,
        '@type': 'WriteRequest',
        iss: 'did:example:alice.id',
        aud: 'did:example:hub.id',
        sub: 'did:example:alice.id',
        commit: {
          protected: commit.getProtectedString(),
          payload: 'foo',
          signature: 'bar',
        },
      }
      const request = new WriteRequest(JSON.stringify(requestData));
      expect(request).toBeDefined();
    });

    it('should require commits to be signed commits', () => {
      const commit = TestCommit.create();
      const requestData = {
        '@context': Context,
        '@type': 'WriteRequest',
        iss: 'did:example:alice.id',
        aud: 'did:example:hub.id',
        sub: 'did:example:alice.id',
        commit: {
          protected: commit.getProtectedString(),
          payload: 'foo',
          signature: 'bar',
        },
      }
      const request = new WriteRequest(JSON.stringify(requestData));
      expect(request.commit instanceof SignedCommit).toBeTruthy();
    });
  });
});