import TestStore from '../mocks/TestStore';
import TestCommit from '../mocks/TestCommit';
import WriteRequest from '../../lib/models/WriteRequest';
import { Context } from '../models/BaseRequest.spec';
import * as store from '../../lib/interfaces/Store';
import StoreUtils from '../../lib/utilities/StoreUtils';
import { Operation } from '../../lib/models/Commit';
import ObjectContainer from '../../lib/interfaces/ObjectContainer';
import HubError, { ErrorCode } from '../../lib/models/HubError';
import PermissionGrant from '../../lib/models/PermissionGrant';

function getHex(): string {
  return Math.round(Math.random() * Number.MAX_SAFE_INTEGER).toString(16);
}

describe('StoreUtils', () => {
  const store = new TestStore();
  const owner = `did:example:${getHex()}`;
  const sender = `${owner}-not`;
  const hub = `did:example:${getHex()}`;

  let commit: TestCommit;
  let request: WriteRequest;
  beforeEach(() => {
    commit = TestCommit.create({
      interface: getHex(),
      context: getHex(),
      type: getHex(),
      object_id: getHex(),
      sub: owner,
      kid: `${sender}#key-1`,
      operation: Operation.Update,
    });
    request = new WriteRequest({
      iss: sender,
      aud: hub,
      sub: owner,
      '@context': Context,
      '@type': 'WriteRequest',
      commit: {
        protected: commit.getProtectedString(),
        payload: commit.getPayloadString(),
        signature: 'foobar',
      },
    });
  });

  describe('objectExists', () => {

    it('should query store with the correct filters', async () => {
      const spy = spyOn(store, "queryObjects").and.callFake((queryRequest: store.ObjectQueryRequest) => {
        expect(queryRequest.owner).toEqual(owner);
        expect(queryRequest.filters).toBeDefined();
        if (!queryRequest.filters) {
          return;
        }
        expect(queryRequest.filters.length).toEqual(4);
        queryRequest.filters.forEach((filter) => {
          expect(filter.type).toEqual('eq');
          if (filter.field !== 'object_id') {
            expect(filter.value).toEqual((commit.getHeaders() as any)[filter.field]);
          } else {
            expect(filter.value).toEqual([commit.getHeaders().object_id]);
          }
        });
        return {
          results: [],
          pagination: {
            skip_token: null,
          },
        };
      });
  
      const shouldBeFalse = await StoreUtils.objectExists(request, store, []);
      expect(spy).toHaveBeenCalled();
      expect(shouldBeFalse).toBeFalsy();
    });

    it('should throw if multiple objects are returned for just one object_id', async () => {
      const spy = spyOn(store, "queryObjects").and.callFake((_: store.ObjectQueryRequest) => {
        const objects: ObjectContainer[] = [];
        const count = Math.round(Math.random() * 10) + 2;
        for (let i = 0; i < count; i++) {
          objects.push({
            interface: 'test',
            context: 'context',
            type: 'type',
            id: getHex(),
            created_by: owner,
            created_at: new Date(Date.now()).toISOString(),
            sub: owner,
            commit_strategy: 'basic'
          });
        }
        return {
          results: objects,
          pagination: {
            skip_token: null,
          },
        };
      });
      try {
        await StoreUtils.objectExists(request, store, []);
        fail('expected a panic');
      } catch (err) {
        if (!(err instanceof HubError)) {
          fail(err.message);
        }
        expect(err.errorCode).toEqual(ErrorCode.ServerError);
      }
      expect(spy).toHaveBeenCalled();
    });

    it('should deny permission if no grant permits the object', async() => {
      const spy = spyOn(store, "queryObjects").and.returnValue({
        results: [
          {
            interface: 'test',
            context: 'context',
            type: 'type',
            id: getHex(),
            created_by: owner,
            created_at: new Date(Date.now()).toISOString(),
            sub: owner,
            commit_strategy: 'basic'
          }
        ],
        pagination: {
          skip_token: null,
        },
      });
      const grant: PermissionGrant = {
        owner,
        grantee: sender,
        allow: 'CRUD-',
        context: 'context',
        type: 'type',
        created_by: `did:example:${getHex()}`
      };
      try {
        await StoreUtils.objectExists(request, store, [grant]);
        fail('expected to throw');
      } catch (err) {
        if (!(err instanceof HubError)) {
          fail(err.message);
        }
        expect(err.errorCode).toEqual(ErrorCode.PermissionsRequired);
      }
      expect(spy).toHaveBeenCalled();
    });

    it('should return true if it exists and is granted', async () => {
      const spy = spyOn(store, "queryObjects").and.returnValue({
        results: [
          {
            interface: 'test',
            context: 'context',
            type: 'type',
            id: getHex(),
            created_by: owner,
            created_at: new Date(Date.now()).toISOString(),
            sub: owner,
            commit_strategy: 'basic'
          }
        ],
        pagination: {
          skip_token: null,
        },
      });
      const grant: PermissionGrant = {
        owner,
        grantee: sender,
        allow: 'CRUD-',
        context: 'context',
        type: 'type',
        created_by: owner
      };
      const shouldBeTrue = await StoreUtils.objectExists(request, store, [grant]);
      expect(shouldBeTrue).toBeTruthy();
      expect(spy).toHaveBeenCalled();
    });
  });

  describe('writeCommit', () => {
    it('should format the request into a commitRequest', async () => {
      const revision = getHex();
      const spy = spyOn(store, 'commit').and.callFake((request: store.CommitRequest) => {
        expect(request.owner).toEqual(owner);
        expect(request.commit).toEqual(request.commit);
        return {
          knownRevisions: [revision],
        };
      });
      const results = await StoreUtils.writeCommit(request, store);
      expect(spy).toHaveBeenCalled();
      expect(results.revisions).toEqual([revision]);
    });
  })
})