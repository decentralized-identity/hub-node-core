import TestContext from '../mocks/TestContext';
import TestAuthorization from '../mocks/TestAuthorization';
import CommitQueryController from '../../lib/controllers/CommitQueryController';
import CommitQueryRequest from '../../lib/models/CommitQueryRequest';
import { HubError, ErrorCode } from '../../lib';
import * as store from '../../lib/interfaces/Store';
import TestCommit from '../mocks/TestCommit';
import BaseRequest from '../../lib/models/BaseRequest';
import TestUtilities from '../TestUtilities';

describe('CommitQueryController', () => {
  const testContext = new TestContext();
  const testAuthorization = new TestAuthorization();
  const controller = new CommitQueryController(testContext, testAuthorization);
  let iss: string;
  let aud: string;
  let sub: string;
  let request: any;

  beforeEach(() => {
    iss = `did:example:${TestUtilities.randomString()}.id`;
    aud = `did:example:${TestUtilities.randomString()}.id`;
    sub = `did:example:${TestUtilities.randomString()}.id`;
    request = {
      iss,
      aud,
      sub,
      '@context': BaseRequest.context,
      '@type': 'CommitQueryRequest',
    };
  });
  // request additional optional fields
  // query {
  // object_id
  // revision
  // skip_token
  // }
  // fields

  describe('handle', () => {
    it('should fail if fields is included', async () => {
      request.fields = ['rev'];

      try {
        await controller.handle(new CommitQueryRequest(request));
        fail('Please remove test CommitQueryController handle should fail if fields is included (CommitQueryController.spec:40)');
      } catch (err) {
        if (!(err instanceof HubError)) {
          fail(err.message);
        }
        expect(err.errorCode).toEqual(ErrorCode.NotImplemented);
        expect(err.property).toEqual('fields');
      }
    });

    it('should send store a request with no filters (full download)', async () => {
      const errorCode = TestUtilities.randomString();
      const spy = spyOn(testContext.store, 'queryCommits').and.callFake((request: store.CommitQueryRequest) => {
        expect(request.owner).toEqual(sub);
        expect(request.skip_token).toBeUndefined();
        expect(!request.filters || request.filters.length === 0).toBeTruthy();
        throw new HubError({
          errorCode: ErrorCode.ServerError,
          developerMessage: errorCode,
        });
      });

      try {
        await controller.handle(new CommitQueryRequest(request));
      } catch (err) {
        if (!(err instanceof HubError)) {
          fail(err.message);
        }
        expect(err.errorCode).toEqual(ErrorCode.ServerError);
        expect(err.developerMessage).toEqual(errorCode);
      }
      expect(spy).toHaveBeenCalled();
    });

    const filterNamesMap: {[requestField: string]: string} = {
      object_id: 'object_id',
      revision: 'rev',
    };
    ['object_id', 'revision'].forEach((filterType) => {
      const value = TestUtilities.randomString();
      const errorCode = TestUtilities.randomString();
      it(`should pass ${filterType} filter to store accordingly`, async () => {
        const spy = spyOn(testContext.store, 'queryCommits').and.callFake((request: store.CommitQueryRequest) => {
          if (!request.filters || request.filters.length === 0) {
            fail('expected filters to be sent to store');
            return;
          }
          expect(request.filters.length).toEqual(1);
  
          const filter = request.filters[0];
          expect(filter.type).toEqual('eq');
          expect(filter.field).toEqual(filterNamesMap[filterType]);
          expect(filter.value).toEqual([value]);
  
          throw new HubError({
            errorCode: ErrorCode.ServerError,
            developerMessage: errorCode,
          });
        });
        const query: any = {};
        query[filterType] = [value];
        request.query = query;
        try {
          await controller.handle(new CommitQueryRequest(request));
        } catch (err) {
          if (!(err instanceof HubError)) {
            fail(err.message);
          }
          expect(err.errorCode).toEqual(ErrorCode.ServerError);
          expect(err.developerMessage).toEqual(errorCode);
        }
        expect(spy).toHaveBeenCalled();
      });
    });

    it('should prune its result for authorization and return as a CommitQueryResponse', async () => {
      const results = [
        TestCommit.create(),
        TestCommit.create(),
      ]
      const storeSpy = spyOn(testContext.store, 'queryCommits').and.returnValue({
        results,
        pagination: {
          skip_token: null,
        },
      });

      const querySpy = spyOn(testAuthorization, 'getPermissionGrantsForCommitQuery').and.callThrough();

      const response = await controller.handle(new CommitQueryRequest(request));
      expect(storeSpy).toHaveBeenCalled();
      expect(querySpy).toHaveBeenCalled();
      expect(response.commits).toEqual(results);
    });

    it('should throw permission errors if no grant is provided', async () => {
      const storeSpy = spyOn(testContext.store, 'queryCommits').and.returnValue({
        results: [],
        pagination: {
          skip_token: null,
        },
      });

      const querySpy = spyOn(testAuthorization, 'getPermissionGrantsForCommitQuery').and.returnValue([]);

      try {
        await controller.handle(new CommitQueryRequest(request));
        fail('expected to throw');
      } catch (err) {
        if (!(err instanceof HubError)) {
          fail(err.message);
        }
        expect(err.errorCode).toEqual(ErrorCode.PermissionsRequired);
      }
      expect(storeSpy).toHaveBeenCalled();
      expect(querySpy).toHaveBeenCalled();
    });

    it('should pass the skip_token to store', async () => {
      const skip = TestUtilities.randomString();
      const returnedSkip = TestUtilities.randomString();
      request.query = {
        skip_token: skip,
      };
      const storeSpy = spyOn(testContext.store, 'queryCommits').and.callFake((request: store.CommitQueryRequest) => {
        expect(request.skip_token).toEqual(skip);
        return {
          results: [],
          pagination: {
            skip_token: returnedSkip,
          },
        };
      });
      const response = await controller.handle(new CommitQueryRequest(request));
      expect(storeSpy).toHaveBeenCalled();
      expect(response.skipToken).toEqual(returnedSkip);
    });
  });
});
