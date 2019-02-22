import { HubErrorCode } from '@decentralized-identity/hub-common-js';
import ErrorResponse from '../../lib/models/ErrorResponse';

describe('ErrorResponse', () => {
  describe('constructor', () => {
    it('should create from just an errorCode', () => {
      const response = new ErrorResponse({
        errorCode: HubErrorCode.ServerError,
      });
      expect(response).toBeDefined();
      expect(response.errorCode).toEqual(HubErrorCode.ServerError);
    });

    it('should copy additional parameters', () => {
      const options = {
        errorCode: HubErrorCode.ServerError,
        errorUrl: Math.round(Math.random() * Number.MAX_SAFE_INTEGER).toString(32),
        userMessage: Math.round(Math.random() * 255).toString(2),
        target: Math.round(Math.random() * 255).toString(16),
        innerError: {
          testParameter: Math.round(Math.random() * 255),
        }
      };
      const response = new ErrorResponse(options);
      expect(response.errorCode).toEqual(options.errorCode);
      expect(response.errorUrl).toEqual(options.errorUrl);
      expect(response.userMessage).toEqual(options.userMessage);
      expect(response.target).toEqual(options.target);
      expect(response.innerError.testParameter).toEqual(options.innerError.testParameter);
    });
  });

  describe('toString', () => {
    it('should format parameters correctly', () => {
      const options = {
        errorCode: HubErrorCode.ServerError,
        errorUrl: Math.round(Math.random() * Number.MAX_SAFE_INTEGER).toString(32),
        userMessage: Math.round(Math.random() * 255).toString(2),
        target: Math.round(Math.random() * 255).toString(16),
        innerError: {
          testParameter: Math.round(Math.random() * 255),
        }
      };
      const response = new ErrorResponse(options);
      const json = JSON.parse(response.toString());
      expect(json.error_code).toEqual(options.errorCode);
      expect(json.error_url).toEqual(options.errorUrl);
      expect(json.user_message).toEqual(options.userMessage);
      expect(json.target).toEqual(options.target);
      expect(json.inner_error.testParameter).toEqual(options.innerError.testParameter);
    });
  })
})