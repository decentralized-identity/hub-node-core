import HubError from '../../lib/models/HubError';

describe('HubError', () => {
  describe('Constructor', () => {
    it('Should return the same code and message', () => {
      const code = Math.round(Math.random() * 600);
      const message = Math.random().toString();
      const error = new HubError(message, code);
      expect(error).toBeDefined();
      expect(error.httpStatusCode).toEqual(code);
      expect(error.message).toEqual(message);
    });
  });
});
