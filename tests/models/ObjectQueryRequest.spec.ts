import ObjectQueryRequest from '../../lib/models/ObjectQueryRequest';
import { Context } from './BaseRequest.spec';
import HubError from '../../lib/models/HubError';

describe('ObjectQueryRequest', () => {
  describe('constructor', () => {
    it('should construct an empty response', () => {
      const request = new ObjectQueryRequest({
        '@context': Context,
        '@type': 'ObjectQueryRequest',
        iss: 'did:example:alice.id',
        aud: 'did:example:hub.id',
        sub: 'did:example:alice.id',
        query: {
          interface: 'Test',
          context: 'example.com',
          type: 'test', 
        }
      });
      expect(request).toBeDefined();
      expect(request.interface).toEqual('Test');
      expect(request.queryContext).toEqual('example.com');
      expect(request.queryType).toEqual('test');
    });



    function validateArray(formRequest: (array: any) => ObjectQueryRequest, jsonPath: string) {
      try {
        formRequest(true);
        fail('did not throw');
      } catch (err) {
        if (!(err instanceof HubError)) {
          fail(err);
        }
        expect(err.property).toEqual(jsonPath);
      }
      
      try {
        formRequest([true]);
        fail('did not throw');
      } catch (err) {
        if (!(err instanceof HubError)) {
          fail(err);
        }
        expect(err.property).toEqual(`${jsonPath}[0]`);
      }
    }

    it('should validate objectIds types', () => {
      validateArray((array) => 
      new ObjectQueryRequest({
        '@context': Context,
        '@type': 'ObjectQueryRequest',
        iss: 'did:example:alice.id',
        aud: 'did:example:hub.id',
        sub: 'did:example:alice.id',
        query: {
          interface: 'Test',
          context: 'example.com',
          type: 'test',
          object_id: array,
        }
      }), 'query.object_id');
    });

    it('should copy objectId filters', () => {
      const objectId = Math.round(Math.random() * 255).toString(16);
      const request = new ObjectQueryRequest({
        '@context': Context,
        '@type': 'ObjectQueryRequest',
        iss: 'did:example:alice.id',
        aud: 'did:example:hub.id',
        sub: 'did:example:alice.id',
        query: {
          interface: 'Test',
          context: 'example.com',
          type: 'test',
          object_id: [objectId],
        }
      });
      if (request.objectIds) {
        expect(request.objectIds[0]).toEqual(objectId);
      } else {
        fail('objectIds were not copied');
      }
    });
    
    it('should validate objectIds types', () => {
      validateArray((array) => 
      new ObjectQueryRequest({
        '@context': Context,
        '@type': 'ObjectQueryRequest',
        iss: 'did:example:alice.id',
        aud: 'did:example:hub.id',
        sub: 'did:example:alice.id',
        query: {
          interface: 'Test',
          context: 'example.com',
          type: 'test',
          object_id: array,
        }
      }), 'query.object_id');
    });

    it('should copy filters', () => {
      const filter = {
        type: 'eq',
        field: 'title',
        value: Math.round(Math.random() * 255).toString(16),
      };
      const request = new ObjectQueryRequest({
        '@context': Context,
        '@type': 'ObjectQueryRequest',
        iss: 'did:example:alice.id',
        aud: 'did:example:hub.id',
        sub: 'did:example:alice.id',
        query: {
          interface: 'Test',
          context: 'example.com',
          type: 'test',
          filters: [filter],
        }
      });
      if (request.filters) {
        expect(request.filters[0]).toEqual(filter);
      } else {
        fail('objectIds were not copied');
      }
    });

    it('should ensure filters is an array', () => {
      try {
        new ObjectQueryRequest({
          '@context': Context,
          '@type': 'ObjectQueryRequest',
          iss: 'did:example:alice.id',
          aud: 'did:example:hub.id',
          sub: 'did:example:alice.id',
          query: {
            interface: 'Test',
            context: 'example.com',
            type: 'test',
            filters: 'just the good ones',
          }
        });
        fail('did not throw');
      } catch (err) {
        if (!(err instanceof HubError)) {
          fail(err);
        }
        expect(err.property).toEqual('query.filters');
      }
    });

    it('should ensure filters objects are not missing properties', () => {
      try {
        new ObjectQueryRequest({
          '@context': Context,
          '@type': 'ObjectQueryRequest',
          iss: 'did:example:alice.id',
          aud: 'did:example:hub.id',
          sub: 'did:example:alice.id',
          query: {
            interface: 'Test',
            context: 'example.com',
            type: 'test',
            filters: [{
              'type': 'missing',
              'field': '*',
            }],
          }
        });
        fail('did not throw');
      } catch (err) {
        if (!(err instanceof HubError)) {
          fail(err);
        }
        expect(err.property).toEqual('query.filters[0].value');
      }
    });

    it('should ensure filters objects are the right type', () => {
      try {
        new ObjectQueryRequest({
          '@context': Context,
          '@type': 'ObjectQueryRequest',
          iss: 'did:example:alice.id',
          aud: 'did:example:hub.id',
          sub: 'did:example:alice.id',
          query: {
            interface: 'Test',
            context: 'example.com',
            type: 'test',
            filters: [{
              'type': 'invalid',
              'field': 3.14159,
              'value': '*',
            }],
          }
        });
        fail('did not throw');
      } catch (err) {
        if (!(err instanceof HubError)) {
          fail(err);
        }
        expect(err.property).toEqual('query.filters[0].field');
      }
    });

    it('should include a skip_token', () => {
      try {
        new ObjectQueryRequest({
          '@context': Context,
          '@type': 'ObjectQueryRequest',
          iss: 'did:example:alice.id',
          aud: 'did:example:hub.id',
          sub: 'did:example:alice.id',
          query: {
            interface: 'Test',
            context: 'example.com',
            type: 'test',
            skip_token: true,
          }
        });
        fail('did not throw');
      } catch (err) {
        if (!(err instanceof HubError)) {
          fail(err);
        }
        expect(err.property).toEqual('query.skip_token');
      }
      const token = Math.round(Math.random() * 255).toString(16);
      const request = new ObjectQueryRequest({
        '@context': Context,
        '@type': 'ObjectQueryRequest',
        iss: 'did:example:alice.id',
        aud: 'did:example:hub.id',
        sub: 'did:example:alice.id',
        query: {
          interface: 'Test',
          context: 'example.com',
          type: 'test',
          skip_token: token,
        }
      });
      expect(request.skipToken).toEqual(token);
    });

    it('should require a query', () => {
      try {
        new ObjectQueryRequest({
          '@context': Context,
          '@type': 'ObjectQueryRequest',
          iss: 'did:example:alice.id',
          aud: 'did:example:hub.id',
          sub: 'did:example:alice.id',
        });
        fail('did not throw');
      } catch (err) {
        if (!(err instanceof HubError)) {
          fail(err);
        }
        expect(err.property).toEqual('query');
      }
    })
  });
});
