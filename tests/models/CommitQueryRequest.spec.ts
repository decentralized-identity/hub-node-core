import { Context } from './BaseRequest.spec';
import CommitQueryRequest from '../../lib/models/CommitQueryRequest';
import HubError from '../../lib/models/HubError';

describe('CommitQueryRequest', () => {
  const sender = 'did:example:alice.id';
  const hub = 'did:example:hub.id';
  describe('constructor', () => {
    it('should construct with no additional parameters', () => {
      const request = new CommitQueryRequest({
        '@context': Context,
        '@type': 'CommitQueryRequest',
        iss: sender,
        aud: hub,
        sub: sender,
      });
      expect(request.objectIds).toBeDefined();
      expect(request.revisions).toBeDefined();
      expect(request.fields).toBeDefined();
    });

    function arrayCopyAndStringRequirement(formRequest: (array: any[]) => CommitQueryRequest, 
      fieldPath: string, 
      getArray: (request: CommitQueryRequest) => string[]) {
      let fields: any[] = [];
      const length = Math.round(Math.random() * 10) + 1;
      for (let i = 0; i < length; i++) {
        const field = Math.round(Math.random() * 255).toString(16);
        fields.push(field);
      }
      const request = formRequest(fields);
      expect(getArray(request)).toEqual(fields);
      const insertAt = Math.round(Math.random() * fields.length);
      fields.splice(insertAt, 0, true);
      try {
        formRequest(fields);
        fail('created the request without error');
      } catch (err) {
        if (!(err instanceof HubError)) {
          fail(err);
        }
        expect(err.property).toContain(fieldPath);
      }
    }

    it('should validate and copy `fields` if present', () => {
      arrayCopyAndStringRequirement((fields) => new CommitQueryRequest({
        fields,
        '@context': Context,
        '@type': 'CommitQueryRequest',
        iss: sender,
        aud: hub,
        sub: sender,
      }), 'fields',
      (request) => request.fields);
    });
  
    it('should create empty filter arrays if `query` exists', () => {
      const request = new CommitQueryRequest({
        '@context': Context,
        '@type': 'CommitQueryRequest',
        iss: sender,
        aud: hub,
        sub: sender,
        query: {
          something: true,
        }
      });
      expect(request.objectIds).toBeDefined();
      expect(request.revisions).toBeDefined();
      expect(request.fields).toBeDefined();
    });

    it('should validate and copy `object_id` if present', () => {
      arrayCopyAndStringRequirement((object_id) => new CommitQueryRequest({
        '@context': Context,
        '@type': 'CommitQueryRequest',
        iss: sender,
        aud: hub,
        sub: sender,
        query: {
          object_id,
        }
      }), 'query.object_id',
      (request) => request.objectIds);
    });

    it('should validate and copy `revision` if present', () => {
      arrayCopyAndStringRequirement((revision) => new CommitQueryRequest({
        '@context': Context,
        '@type': 'CommitQueryRequest',
        iss: sender,
        aud: hub,
        sub: sender,
        query: {
          revision,
        }
      }), 'query.revision',
      (request) => request.revisions);
    });

    it('should copy `skip_token` if present', () => {
      const skip_token = Math.round(Math.random() * 255).toString(16);
       const request = new CommitQueryRequest({
        '@context': Context,
        '@type': 'CommitQueryRequest',
        iss: sender,
        aud: hub,
        sub: sender,
        query: {
          skip_token,
        }
      });
      expect(request.skipToken).toEqual(skip_token);
    });

    it('should validate `skip_token` if present', () => {
      try {
        new CommitQueryRequest({
          '@context': Context,
          '@type': 'CommitQueryRequest',
          iss: sender,
          aud: hub,
          sub: sender,
          query: {
            skip_token: true,
          }
        });
        fail('invalid skip_token allowed')
      } catch (err) {
        if (!(err instanceof HubError)) {
          fail(err);
        }
        expect(err.property).toEqual('query.skip_token');
      }
    });
  });
});
