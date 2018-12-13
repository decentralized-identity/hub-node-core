import HubError, { ErrorCode, DeveloperMessage } from '../../lib/models/HubError';
import TestController from '../mocks/TestController';
import TestContext from '../mocks/TestContext';
import TestAuthorization from '../mocks/TestAuthorization';
import TestRequest from '../mocks/TestRequest';
import { OWNER_PERMISSION } from '../../lib/models/PermissionGrant';
import { ObjectQueryRequest } from '../../lib/interfaces/Store';
import TestUtilities from '../testUtilities';

describe('BaseController', () => {
  const testContext = new TestContext();
  const auth = new TestAuthorization();
  const controller = new TestController(testContext, auth);

  describe('handle', () => {
    it('should throw for unauthorized requests', async () => {
      const expectedRequest = TestRequest.createWriteRequest({sub: 'did:example:bob.id'});
      spyOn(auth, 'getPermissionGrantsForRequest').and.returnValue([]);
      try {
        await controller.handle(expectedRequest);
        fail('Did not throw');
      } catch (err) {
        if (!(err instanceof HubError)) {
          fail(err.message);
        }
        expect(err.errorCode).toEqual(ErrorCode.PermissionsRequired);
      }
    });

    it('should dispatch Read requests', async () => {
      const message = TestUtilities.randomString();
      const queryRequest = TestRequest.createObjectQueryRequest();
      const spy = spyOn(controller, 'handleQueryRequest').and.callFake(() => {
        throw new HubError({
          errorCode: ErrorCode.NotImplemented,
          developerMessage: message,
        });
      });
      try {
        await controller.handle(queryRequest);
      } catch (err) {
        if (!(err instanceof HubError)) {
          fail(err.message);
        }
        expect(err.developerMessage).toEqual(message);
      }
      expect(spy).toHaveBeenCalled();
    });

    it('should dispatch Write requests', async () => {
      const message = TestUtilities.randomString();
      const queryRequest = TestRequest.createWriteRequest();
      const spy = spyOn(controller, 'handleWriteCommitRequest').and.callFake(() => {
        throw new HubError({
          errorCode: ErrorCode.NotImplemented,
          developerMessage: message,
        });
      });
      try {
        await controller.handle(queryRequest);
      } catch (err) {
        if (!(err instanceof HubError)) {
          fail(err.message);
        }
        expect(err.developerMessage).toEqual(message);
      }
      expect(spy).toHaveBeenCalled();
    });

    it('should return errors for unknown operations', async () => {
      try {
        const expectedRequest = TestRequest.createWriteRequest({operation: 'TestOperation'});
        await controller.handle(expectedRequest);
        fail('did not throw an error');
      } catch (err) {
        if (!(err instanceof HubError)) {
          fail(err.message);
        }
        const testError = err as HubError;
        expect(testError.errorCode).toEqual(ErrorCode.BadRequest);
        expect(testError.property).toEqual('commit.protected.operation');
        expect(testError.developerMessage).toEqual(DeveloperMessage.IncorrectParameter);
      }
    });

    it('should return errors for unknown types', async () => {
      try {
        const expectedRequest = TestRequest.createWriteRequest();
        expectedRequest['type'] = 'UnknownRequestType';
        await controller.handle(expectedRequest);
        fail('did not throw an error');
      } catch (err) {
        if (!(err instanceof HubError)) {
          fail(err.message);
        }
        const testError = err as HubError;
        expect(testError.errorCode).toEqual(ErrorCode.BadRequest);
        expect(testError.property).toEqual('@type');
        expect(testError.developerMessage).toEqual(DeveloperMessage.IncorrectParameter);
      }
    });

    it('should throw if the commit subject does not match the request subject', async() => {
      try {
        const badRequest = TestRequest.createWriteRequest({override_commit_sub: 'did:example:bob.id'});
        await controller.handle(badRequest);
        fail('did not throw an error');
      } catch (err) {
        if (!(err instanceof HubError)) {
          fail(err.message);
        }
        const testError = err as HubError;
        expect(testError.errorCode).toEqual(ErrorCode.BadRequest);
        expect(testError.property).toEqual('commit.protected.sub');
        expect(testError.developerMessage).toEqual(DeveloperMessage.IncorrectParameter);
      }
    });
  });

  describe('handleQueryRequest', () => {
    it('should query the storage with just the interface', async () => {
      const spy = spyOn(testContext.store, "queryObjects").and.callFake((queryRequest: ObjectQueryRequest) => {
        expect(queryRequest.owner).toEqual('did:example:alice.id');
        return {
          results: [],
          pagination: {
            skip_token: null,
          },
        };
      });
      controller.handleQueryRequest(TestRequest.createObjectQueryRequest({
        override_no_context: true,
        override_no_type: true,
      }), [OWNER_PERMISSION]);
      expect(spy).toHaveBeenCalled();
    });

    ['interface', 'context', 'type'].forEach((parameter) => {
      const value = TestUtilities.randomString();
      it('should match optionals to the right filters', async () => {
      const spy = spyOn(testContext.store, "queryObjects").and.callFake((queryRequest: ObjectQueryRequest) => {
        if (!queryRequest.skip_token) {
          fail('expected ObjectQueryRequest to contain skip_token');
          return;
        }
        expect(queryRequest.skip_token).toEqual('yes skip token');
        if (!queryRequest.filters) {
          fail('expected ObjectQueryRequest to contain filters');
          return;
        }
        queryRequest.filters.forEach((filter) => {
          if (filter.field === parameter) {
            expect(filter.type).toEqual('eq');
            expect(filter.value).toEqual(value);
          }
        });
        return {
          results: [],
          pagination: {
            skip_token: null,
          },
        };
      });
      const options: any = {
        skipToken: 'yes skip token',
      };
      options[parameter] = value;
      controller.handleQueryRequest(TestRequest.createObjectQueryRequest(options), [OWNER_PERMISSION]);
      expect(spy).toHaveBeenCalled();
    });
    })
    
  })
});
