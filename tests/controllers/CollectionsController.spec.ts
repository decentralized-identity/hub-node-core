import CollectionsController from '../../lib/controllers/CollectionsController';
import TestContext from '../mocks/TestContext';
import WriteRequest from '../../lib/models/WriteRequest';
import { Context } from '../models/BaseRequest.spec';
import { Base64Url } from '@decentralized-identity/did-auth-jose';
import { Operation } from '../../lib/models/Commit';

const sender = 'did:example:alice.id';
const hub = 'did:example:alice.id';

function createCommit(operation: Operation, testHeader: string): WriteRequest {
  return new WriteRequest({
    '@context': Context,
    '@type': 'WriteRequest',
    iss: sender,
    aud: hub,
    sub: sender,
    commit: {
      protected: Base64Url.encode(JSON.stringify({
        operation,
        interface: 'Collections',
        context: 'example.com',
        type: 'Person',
        committed_at: new Date(Date.now()).toISOString(),
        commit_strategy: 'basic',
        sub: sender,
        kid: `${sender}#key-1`,
      })),
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
  });
})