import TestStore from "../mocks/TestStore";
import { CommitQueryRequest, CommitQueryResponse } from "../../lib/interfaces/Store";
import CommitStrategyBasic from "../../lib/utilities/CommitStrategyBasic";
import TestCommit from "../mocks/TestCommit";
import { PERMISSION_GRANT_CONTEXT, PERMISSION_GRANT_TYPE } from "../../lib/models/PermissionGrant";
import { Operation } from "../../lib/models/Commit";

function getHex(): string {
  return Math.round(Math.random() * Number.MAX_SAFE_INTEGER).toString(16);
}

describe('CommitStrategyBasic', () => {
  const store = new TestStore();
  let spy: jasmine.Spy;
  beforeEach(() => {
    spy = spyOn(store, 'queryCommits');
  });

  describe('getCommits', () => {
    it('should submit the proper queries to store', async () => {
      const owner = `did:example:${getHex()}`;
      const objectId = getHex();
      spy.and.callFake((query: CommitQueryRequest) => {
        expect(query.owner).toEqual(owner);
        if (!query.filters) {
          fail('no filters sent to store');
          return;
        }
        expect(query.filters.length).toEqual(1);
        expect(query.filters[0].field).toEqual('object_id');
        expect(query.filters[0].type).toEqual('eq');
        expect(query.filters[0].value).toEqual(objectId);
        expect(query.skip_token).toBeUndefined();
        return {
          results: [],
          pagination: {
            skip_token: null,
          }
        } as CommitQueryResponse
      });
      await CommitStrategyBasic.resolveObject(owner, objectId, store);
      expect(spy).toHaveBeenCalled();
    });
  });

  describe('resolveObject', () => {
    it('should resolve a single commit', async () => {
      const owner = `did:example:${getHex()}`;
      const testCommit = TestCommit.create({
        interface: 'Permissions',
        context: PERMISSION_GRANT_CONTEXT,
        type: PERMISSION_GRANT_TYPE,
        operation: Operation.Create,
        sub: owner,
        commit_strategy: 'basic',
        kid: `${owner}#key-1`,
      });

      spy.and.returnValue({
        results: [
          testCommit
        ],
        pagination: {
          skip_token: null
        }
      });

      const commit = await CommitStrategyBasic.resolveObject(owner, getHex(), store);
      expect(commit).toEqual(testCommit);
    });

    it('should take the latest commit', async (done) => {
      const owner = `did:example:${getHex()}`;
      
      const earlierCommit = TestCommit.create({
        interface: 'Permissions',
        context: PERMISSION_GRANT_CONTEXT,
        type: PERMISSION_GRANT_TYPE,
        operation: Operation.Create,
        sub: owner,
        commit_strategy: 'basic',
        kid: `${owner}#key-1`,
      });

      setTimeout(async () => {
        const laterCommit = TestCommit.create({
          interface: 'Permissions',
          context: PERMISSION_GRANT_CONTEXT,
          type: PERMISSION_GRANT_TYPE,
          operation: Operation.Create,
          sub: owner,
          commit_strategy: 'basic',
          kid: `${owner}#key-2`,
        });
    
        spy.and.returnValue({
          results: [
            earlierCommit,
            laterCommit,
            earlierCommit,
          ],
          pagination: {
            skip_token: null
          }
        });
    
        const commit = await CommitStrategyBasic.resolveObject(owner, getHex(), store);
        expect(commit).toEqual(laterCommit);
        done();
      }, 1000);
    });
  });
});