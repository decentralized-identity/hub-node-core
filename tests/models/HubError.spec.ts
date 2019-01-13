import HubError, { ErrorCode, DeveloperMessage } from '../../lib/models/HubError';

describe('HubError', () => {
  describe('constructor', () => {
    it('should return the same code and message', () => {
      const message = Math.random().toString();
      const error = new HubError({
        errorCode: ErrorCode.ServerError,
        developerMessage: message,
      });
      expect(error).toBeDefined();
      expect(error.errorCode).toEqual(ErrorCode.ServerError);
      expect(error.developerMessage).toEqual(message);
    });
  });

  describe('toResponse', () => {
    it('should have the same information as the error', () => {
      const message = Math.random().toString();
      const error = new HubError({
        errorCode: ErrorCode.ServerError,
        developerMessage: message,
      });
      const response = error.toResponse();
      expect(response.errorCode).toEqual(error.errorCode);
      expect(response.developerMessage).toEqual(error.developerMessage);
    });

    it('should auto fill the developer message for not implemented', () => {
      const error = new HubError({
        errorCode: ErrorCode.NotImplemented,
      });
      const response = error.toResponse();
      expect(response.errorCode).toEqual(ErrorCode.NotImplemented);
      expect(response.developerMessage).toEqual(DeveloperMessage.NotImplemented);
    })
  });
});
