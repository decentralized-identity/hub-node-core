import CollectionsController from '../../lib/controllers/CollectionsController';
import TestContext from '../mocks/TestContext';
import WriteRequest from '../../lib/models/WriteRequest';
import { Context } from '../models/BaseRequest.spec';
import { Base64Url } from '@decentralized-identity/did-auth-jose';
import { Operation } from '../../lib/models/Commit';
import HubError from '../../lib/models/HubError';

const sender = 'did:example:alice.id';
const hub = 'did:example:alice.id';

function createCommit(operation: Operation, testHeader: string, additionalProtected?: {[key: string]: string}): WriteRequest {
  const protectedHeaders = Object.assign({
    operation,
    interface: 'Collections',
    context: 'example.com',
    type: 'Person',
    committed_at: new Date(Date.now()).toISOString(),
    commit_strategy: 'basic',
    sub: sender,
    kid: `${sender}#key-1`,
  }, additionalProtected);

  return new WriteRequest({
    '@context': Context,
    '@type': 'WriteRequest',
    iss: sender,
    aud: hub,
    sub: sender,
    commit: {
      protected: Base64Url.encode(JSON.stringify(protectedHeaders)),
      header: {
        iss: sender,
        test: testHeader,
      },
      payload: 'payload',
      signature: 'signature',
    }
  });
}

describe('CollectionsController', () => {
  const context = new TestContext();
  const controller = new CollectionsController(context);
  describe('handleCreateRequest', () => {
    it('should call the storage layer', () => {
      const correlationId = Math.round(Math.random() * Number.MAX_SAFE_INTEGER).toString(16);
      const spy = spyOn(context.store, 'commit').and.callFake((request: WriteRequest) => {
        expect((request.commit.getHeaders() as any)['test']).toEqual(correlationId);
      });
      const commitRequest = createCommit(Operation.Create, correlationId);
      controller.handleCreateRequest(commitRequest);
      expect(spy).toHaveBeenCalled();
    });

    it('should throw if object_id is included in the protected headers', () => {
      const correlationId = Math.round(Math.random() * Number.MAX_SAFE_INTEGER).toString(16);
      const spy = spyOn(context.store, 'commit').and.callFake((_: WriteRequest) => {
        fail('storage was called');
      });
      try {
        const commitRequest = createCommit(Operation.Create, correlationId, {
          object_id: 'foobarbaz',
        });
        controller.handleCreateRequest(commitRequest);
      } catch (err) {
        if (!(err instanceof HubError)) {
          fail(err.message);
        }
        expect(err.property).toEqual('commit.protected.object_id');
      }
      expect(spy).not.toHaveBeenCalled();
    });
  });
})