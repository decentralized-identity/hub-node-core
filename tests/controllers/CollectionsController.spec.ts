import CollectionsController from '../../lib/controllers/CollectionsController';
import TestContext from '../mocks/TestContext';
import HubError, { ErrorCode } from '../../lib/models/HubError';
import * as store from '../../lib/interfaces/Store';
import ObjectContainer from '../../lib/interfaces/ObjectContainer';
import TestAuthorization from '../mocks/TestAuthorization';
import AuthorizationController from '../../lib/controllers/AuthorizationController';
import PermissionGrant from '../../lib/models/PermissionGrant';
import TestUtilities from '../TestUtilities';
import TestRequest from '../mocks/TestRequest';

function createSpyThatReturnsObjectsFor(contextObject: any, ids: string[]): jasmine.Spy {
  return spyOn(contextObject.store, 'queryObjects').and.callFake((query: store.QueryRequest) => {
    const results: ObjectContainer[] = [];
    if (query.filters) {
      query.filters.forEach((filter) => {
        if (filter.field === 'object_id') {
          (filter.value as string[]).forEach((id: string) => {
            if (ids.includes(id)) {
              results.push({
                interface: 'Collections',
                context: 'example.com',
                type: 'test',
                id,
                created_by: 'did:example:alice.id',
                created_at: new Date(Date.now()).toISOString(),
                sub: 'did:example:alice.id',
                commit_strategy: 'basic',
              });
            }
          })
        }
      });
    }
    return {
      results,
    };
  });
}

describe('CollectionsController', () => {
  const context = new TestContext();
  const auth = new TestAuthorization();
  const controller = new CollectionsController(context, auth);

  beforeEach(() => {
    spyOn(AuthorizationController, 'pruneResults').and.callFake((results: ObjectContainer[], _:PermissionGrant[]) => { return results; });
  });

  describe('handleWriteCommitRequest', () => {
    ["update", "delete"].forEach((operation) => {
      it(`should ${operation} existing objects`, async () => {
        const id = TestUtilities.randomString();
        const spy = createSpyThatReturnsObjectsFor(context, [id]);
        const request = TestRequest.createWriteRequest({
          interface: 'Collections',
          operation,
          object_id: id,
        })
        const operationSpy = spyOn(context.store, 'commit').and.callFake((commit: store.CommitRequest) => {
          expect(commit.owner).toEqual('did:example:alice.id');
          expect(commit.commit.getProtectedHeaders().object_id).toEqual(id);
          return {
            knownRevisions: [id]
          };
        });
        const response = await controller.handleWriteCommitRequest(request, TestUtilities.allowPermissionGrants);
        expect(spy).toHaveBeenCalled();
        expect(operationSpy).toHaveBeenCalled();
        expect(response.revisions).toEqual([id]);
      });
      it(`should fail to ${operation} if the object does not exist`, async () => {
        const id = TestUtilities.randomString();
        const spy = createSpyThatReturnsObjectsFor(context, []);
        const request = TestRequest.createWriteRequest({
          interface: 'Collections',
          operation,
          object_id: id,
        });
        const operationSpy = spyOn(context.store, 'commit');
        try {
          await controller.handleWriteCommitRequest(request, TestUtilities.allowPermissionGrants);
          fail('did not throw');
        } catch (err) {
          if (!(err instanceof HubError)) {
            fail(err.message);
          }
          expect(err.errorCode).toEqual(ErrorCode.NotFound);
        }
        expect(spy).toHaveBeenCalled();
        expect(operationSpy).not.toHaveBeenCalled();
      });
    });
  });
});
