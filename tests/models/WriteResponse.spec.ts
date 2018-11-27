import WriteResponse from '../../lib/models/WriteResponse';

describe('WriteResponse', () => {
  describe('constructor', () => {
    it('should create an empty response', () => {
      const response = new WriteResponse([]);
      expect(response).toBeDefined();
      expect(response.revisions).toEqual([]);
    });

    it('should save revisions', () => {
      const length = Math.round(Math.random() * 10) + 1;
      const revisions = [];
      for(let i = 0; i < length; i++) {
        revisions.push(Math.round(Math.random() * Number.MAX_SAFE_INTEGER).toString(16));
      }
      const response = new WriteResponse(revisions);
      expect(response.revisions).toEqual(revisions);
    });
  });

  describe('toString', () => {
    it('should add revisions as revision', () => {
      const revisions = ['foo', 'bar', 'baz'];
      const response = new WriteResponse(revisions, 'test');
      const json = JSON.parse(response.toString());
      expect(json.revision).toBeDefined();
      expect(json.revision).toEqual(revisions);
      expect(json.developer_message).toEqual('test');
    });
  });
});
