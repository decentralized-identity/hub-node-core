import CommitQueryResponse from '../../lib/models/CommitQueryResponse';
import TestCommit from '../mocks/TestCommit';

describe('CommitQueryResponse', () => {
  describe('constructor', () => {
    it('should construct an empty return', () => {
      const response = new CommitQueryResponse([], null);
      expect(response).toBeDefined();
    });

    it('should accept commits, skip_token, and developer message', () => {
      const skip = Math.round(Math.random() * 255).toString(16);
      const message = Math.round(Math.random() * 255).toString(16);
      const commits = [
        TestCommit.create(),
      ];
      const response = new CommitQueryResponse(commits, skip, message);
      expect(response.commits).toEqual(commits);
      expect(response.skipToken).toEqual(skip);
      expect(response.developerMessage).toEqual(message);
    });
  });

  describe('toString', () => {
    it('should serialize messages', () => {
      const skip = Math.round(Math.random() * 255).toString(16);
      const message = Math.round(Math.random() * 255).toString(16);
      const commits = [
        TestCommit.create(),
      ];
      const response = new CommitQueryResponse(commits, skip, message);
      const json = JSON.parse(response.toString());
      expect(json.commits[0]).toEqual(commits[0].toJson());
      expect(json.skip_token).toEqual(skip);
      expect(json.developer_message).toEqual(message);
      expect(json['@type']).toEqual('CommitQueryResponse');
    });
  })
});
