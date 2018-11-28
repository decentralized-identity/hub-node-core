import CollectionsController from '../../lib/controllers/CollectionsController';
import TestContext from '../mocks/TestContext';
import WriteRequest from '../../lib/models/WriteRequest';
import { Context } from '../models/BaseRequest.spec';
import { Base64Url } from '@decentralized-identity/did-auth-jose';
import { Operation } from '../../lib/models/Commit';
import HubError from '../../lib/models/HubError';
import ObjectQueryRequest from '../../lib/models/ObjectQueryRequest';
import * as store from '../../lib/interfaces/Store';

const sender = 'did:example:alice.id';
const hub = 'did:example:alice.id';

function correlationId(): string {
  return Math.round(Math.random() * Number.MAX_SAFE_INTEGER).toString(16);
}

function createWriteCommit(operation: Operation, testHeader: string, additionalProtected?: {[key: string]: string}): WriteRequest {
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

function createQueryCommit(query: {[key: string]: any}): ObjectQueryRequest {
  const defaultQuery = Object.assign({
    interface: 'Test',
    context: 'example.com',
    type: 'Test',   
  }, query);
  return new ObjectQueryRequest({
    '@context': Context,
    '@type': 'WriteRequest',
    iss: sender,
    aud: hub,
    sub: sender,
    query: defaultQuery,
  });
}

describe('CollectionsController', () => {
  const context = new TestContext();
  const controller = new CollectionsController(context);
  describe('handleCreateRequest', () => {
    it('should call the storage layer', async () => {
      const id = correlationId();
      const spy = spyOn(context.store, 'commit').and.callFake((request: WriteRequest) => {
        expect((request.commit.getHeaders() as any)['test']).toEqual(id);
        return {knownRevisions: []};
      });
      const commitRequest = createWriteCommit(Operation.Create, id);
      await controller.handleCreateRequest(commitRequest);
      expect(spy).toHaveBeenCalled();
    });

    it('should throw if object_id is included in the protected headers', async () => {
      const id = correlationId();
      const spy = spyOn(context.store, 'commit').and.callFake((_: WriteRequest) => {
        fail('storage was called');
      });
      try {
        const commitRequest = createWriteCommit(Operation.Create, id, {
          object_id: 'foobarbaz',
        });
        await controller.handleCreateRequest(commitRequest);
      } catch (err) {
        if (!(err instanceof HubError)) {
          fail(err.message);
        }
        expect(err.property).toEqual('commit.protected.object_id');
      }
      expect(spy).not.toHaveBeenCalled();
    });
  });

  describe('handleQueryRequest', () => {
    it('should reformat query into filters', async () => {
      const query = createQueryCommit({});
      const spy = spyOn(context.store, 'queryObjects').and.callFake((queryRequest: store.ObjectQueryRequest) => {
        expect(queryRequest.owner).toEqual(sender);
        expect(queryRequest.filters).toBeDefined();
        let countFound = 0;
        if (!queryRequest.filters) {
          fail('no filters defined.');
          return;
        }
        queryRequest.filters.forEach((filter) => {
          switch(filter.field) {
            case 'interface':
              expect(filter.value).toEqual('Test');
              expect(filter.type).toEqual('eq');
              countFound++;
              break;
            case 'context':
              expect(filter.value).toEqual('example.com');
              expect(filter.type).toEqual('eq');
              countFound++;
              break;
            case 'type': 
              expect(filter.value).toEqual('Test');
              expect(filter.type).toEqual('eq');
              countFound++;
              break;
          }
        });
        expect(countFound).toEqual(3);
        return {
          results: [],
          pagination: {
            skip_token: null,
          },
        };
      });
      await controller.handleQueryRequest(query);
      expect(spy).toHaveBeenCalled();
    });

    it('should include object_id filter if included', async () => {
      const id = correlationId();
      const query = createQueryCommit({object_id: [id]});
      const spy = spyOn(context.store, 'queryObjects').and.callFake((queryRequest: store.ObjectQueryRequest) => {
        expect(queryRequest.owner).toEqual(sender);
        expect(queryRequest.filters).toBeDefined();
        if (!queryRequest.filters) {
          fail('no filters defined.');
          return;
        }
        let found = false;
        queryRequest.filters.forEach((filter) => {
          if (filter.field === 'object_id') {
            expect(filter.type).toEqual('eq');
            expect(filter.value).toEqual([id]);
            found = true;
          }
        });
        expect(found).toBeTruthy();
        return {
          results: [],
          pagination: {
            skip_token: null,
          },
        };
      });
      await controller.handleQueryRequest(query);
      expect(spy).toHaveBeenCalled();
    });

    it('should include skip_token if included', async () => {
      const id = correlationId();
      const query = createQueryCommit({skip_token: id});
      const spy = spyOn(context.store, 'queryObjects').and.callFake((queryRequest: store.ObjectQueryRequest) => {
        expect(queryRequest.owner).toEqual(sender);
        expect(queryRequest.skip_token).toBeDefined();
        expect(queryRequest.skip_token).toEqual(id);
        return {
          results: [],
          pagination: {
            skip_token: `${id}-returned`,
          },
        };
      });
      const response = await controller.handleQueryRequest(query);
      expect(spy).toHaveBeenCalled();
      expect(response.skipToken).toEqual(`${id}-returned`);
    });
  });

  
});
