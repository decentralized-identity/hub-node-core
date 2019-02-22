import { IObjectMetadata } from '@decentralized-identity/hub-common-js';
import ObjectQueryResponse from '../../lib/models/ObjectQueryResponse';

describe('ObjectQueryResponse', () => {
  function createObject(): IObjectMetadata {
    return {
      interface: 'Test',
      context: 'example.com',
      type: 'test',
      id: Math.round(Math.random() * 255).toString(16),
      created_by: 'did:example:bob.id',
      created_at: new Date(Date.now()).toISOString(),
      sub: 'did:example:alice.id',
      commit_strategy: 'basic',
    };
  }

  describe('constructor', () => {
    it('should create an empty container', () => {
      const response = new ObjectQueryResponse([], null);
      expect(response).toBeDefined();
      expect(response.objects).toEqual([]);
      expect(response.skipToken).toEqual(null);
    });

    it('should copy objects to return', () => {
      const object = createObject();
      const response = new ObjectQueryResponse([object], null);
      expect(response.objects[0]).toEqual(object);
    });

    it('should copy skip_token to return', () => {
      const skip = Math.round(Math.random() * 255).toString(16);
      const response = new ObjectQueryResponse([], skip);
      expect(response.skipToken).toEqual(skip);
    });
  });

  describe('toString', () => {
    it('should return through the right parameters', () => {
      const object = createObject();
      const skip = Math.round(Math.random() * 255).toString(16);
      const response = new ObjectQueryResponse([object], skip);
  
      const json = JSON.parse(response.toString());
      expect(json.objects[0]).toEqual(object);
      expect(json.skip_token).toEqual(skip);
    });
  });
});
