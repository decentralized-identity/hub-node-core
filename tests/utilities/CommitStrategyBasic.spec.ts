import { CommitOperation } from '@decentralized-identity/hub-common-js';
import TestStore from "../mocks/TestStore";
import { CommitQueryRequest, CommitQueryResponse } from "../../lib/interfaces/Store";
import CommitStrategyBasic from "../../lib/utilities/CommitStrategyBasic";
import TestCommit from "../mocks/TestCommit";
import { PERMISSION_GRANT_CONTEXT, PERMISSION_GRANT_TYPE } from "../../lib/models/PermissionGrant";
import TestUtilities from "../TestUtilities";

describe('CommitStrategyBasic', () => {
  const store = new TestStore();
  let spy: jasmine.Spy;
  beforeEach(() => {
    spy = spyOn(store, 'queryCommits');
  });

  describe('getCommits', () => {
    it('should submit the proper queries to store', async () => {
      const owner = `did:example:${TestUtilities.randomString()}`;
      const objectId = TestUtilities.randomString();
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
      const owner = `did:example:${TestUtilities.randomString()}`;
      const testCommit = TestCommit.create({
        interface: 'Permissions',
        context: PERMISSION_GRANT_CONTEXT,
        type: PERMISSION_GRANT_TYPE,
        operation: CommitOperation.Create,
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

      const commit = await CommitStrategyBasic.resolveObject(owner, TestUtilities.randomString(), store);
      expect(commit).toEqual(testCommit);
    });

    
    it('should resolve update before create commits', async () => {
      const owner = `did:example:${TestUtilities.randomString()}`;
      const dateTime = new Date();

      const create = TestCommit.create({
        interface: 'Permissions',
        context: PERMISSION_GRANT_CONTEXT,
        type: PERMISSION_GRANT_TYPE,
        operation: CommitOperation.Create,
        sub: owner,
        commit_strategy: 'basic',
        kid: `${owner}#key-1`,
        committed_at: dateTime
      });
      
      const update = TestCommit.create({
        interface: 'Permissions',
        context: PERMISSION_GRANT_CONTEXT,
        type: PERMISSION_GRANT_TYPE,
        operation: CommitOperation.Update,
        sub: owner,
        commit_strategy: 'basic',
        kid: `${owner}#key-1`,
        committed_at: new Date(dateTime.valueOf() - 1000),
        object_id: create.getHeaders().rev,
      });

      spy.and.returnValue({
        results: [
          create,
          update
        ],
        pagination: {
          skip_token: null
        }
      });

      const commit = await CommitStrategyBasic.resolveObject(owner, TestUtilities.randomString(), store);
      expect(commit).toEqual(update);
    });


    it('should resolve delete before update commits', async () => {
      const owner = `did:example:${TestUtilities.randomString()}`;
      const dateTime = new Date();
      const id = TestUtilities.randomString();

      const update = TestCommit.create({
        interface: 'Permissions',
        context: PERMISSION_GRANT_CONTEXT,
        type: PERMISSION_GRANT_TYPE,
        operation: CommitOperation.Update,
        sub: owner,
        commit_strategy: 'basic',
        kid: `${owner}#key-1`,
        committed_at: dateTime,
        object_id: id,
      });
      
      const deleteCommit = TestCommit.create({
        interface: 'Permissions',
        context: PERMISSION_GRANT_CONTEXT,
        type: PERMISSION_GRANT_TYPE,
        operation: CommitOperation.Delete,
        sub: owner,
        commit_strategy: 'basic',
        kid: `${owner}#key-1`,
        committed_at: new Date(dateTime.valueOf() - 1000),
        object_id: id,
      });

      spy.and.returnValue({
        results: [
          update,
          deleteCommit
        ],
        pagination: {
          skip_token: null
        }
      });

      const commit = await CommitStrategyBasic.resolveObject(owner, TestUtilities.randomString(), store);
      expect(commit).toEqual(deleteCommit);
    });

    it('should take the latest commit', async (done) => {
      const owner = `did:example:${TestUtilities.randomString()}`;
      
      const earlierCommit = TestCommit.create({
        interface: 'Permissions',
        context: PERMISSION_GRANT_CONTEXT,
        type: PERMISSION_GRANT_TYPE,
        operation: CommitOperation.Create,
        sub: owner,
        commit_strategy: 'basic',
        kid: `${owner}#key-1`,
      });

      setTimeout(async () => {
        const laterCommit = TestCommit.create({
          interface: 'Permissions',
          context: PERMISSION_GRANT_CONTEXT,
          type: PERMISSION_GRANT_TYPE,
          operation: CommitOperation.Create,
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
    
        const commit = await CommitStrategyBasic.resolveObject(owner, TestUtilities.randomString(), store);
        expect(commit).toEqual(laterCommit);
        done();
      }, 1000);
    });

    it('should fallback to the commit hash if they have the same time', async () => {
      const owner = `did:example:${TestUtilities.randomString()}`;
      const dateTime = new Date();
      const id = TestUtilities.randomString();
      
      const commitOne = TestCommit.create({
        interface: 'Permissions',
        context: PERMISSION_GRANT_CONTEXT,
        type: PERMISSION_GRANT_TYPE,
        operation: CommitOperation.Update,
        object_id: id,
        sub: owner,
        commit_strategy: 'basic',
        kid: `${owner}#key-1`,
        committed_at: dateTime,
      });

      const commitTwo = TestCommit.create({
        interface: 'Permissions',
        context: PERMISSION_GRANT_CONTEXT,
        type: PERMISSION_GRANT_TYPE,
        operation: CommitOperation.Update,
        object_id: id,
        sub: owner,
        commit_strategy: 'basic',
        kid: `${owner}#key-2`,
        committed_at: dateTime
      });

      const theCommit = commitOne.getHeaders().rev! > commitTwo.getHeaders().rev! ? commitOne : commitTwo;
      const notTheCommit = commitOne.getHeaders().rev! > commitTwo.getHeaders().rev! ? commitTwo : commitOne;
  
      spy.and.returnValue({
        results: [
          notTheCommit,
          theCommit
        ],
        pagination: {
          skip_token: null
        }
      });
  
      const commit = await CommitStrategyBasic.resolveObject(owner, TestUtilities.randomString(), store);
      expect(commit).toEqual(theCommit);
    });
  });
});