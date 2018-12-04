import TestStore from '../mocks/TestStore';
import TestCommit from '../mocks/TestCommit';
import WriteRequest from '../../lib/models/WriteRequest';
import { Context } from '../models/BaseRequest.spec';
import * as store from '../../lib/interfaces/Store';
import StoreUtils from '../../lib/utilities/StoreUtils';
import { Operation } from '../../lib/models/Commit';

function getHex(): string {
  return Math.round(Math.random() * Number.MAX_SAFE_INTEGER).toString(16);
}

describe('StoreUtils', () => {
  const store = new TestStore();
  const owner = `did:example:${getHex()}`;
  const sender = `${owner}-not`;
  const hub = `did:example:${getHex()}`;

  describe('objectExists', () => {
    it('should query store with the correct filters', async () => {
      const commit = TestCommit.create({
        interface: getHex(),
        context: getHex(),
        type: getHex(),
        object_id: getHex(),
        sub: owner,
        kid: `${sender}#key-1`,
        operation: Operation.Update,
      });
      const request = new WriteRequest({
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
  });
})