import base64url from 'base64url';
import Commit, { Operation } from '../../lib/models/Commit';
import HubError, { DeveloperMessage } from '../../lib/models/HubError';
import TestUtilities from '../TestUtilities';
import Context from '../../lib/interfaces/Context';

class SimpleCommit extends Commit {
  async validate(_: Context): Promise<void> {
  }

  toJson() {
    throw new Error("Method not implemented.");
  }
}

describe('Commit', () => {
  describe('constructor', () => {
    it("should require protected", () => {
      try {
        new SimpleCommit({
          header: 'not the right kind of header',
          payload: 'foo',
        });
        fail('did not throw');
      } catch (err) {
        if (!(err instanceof HubError)) {
          fail(err.message)
        }
        expect(err.property).toEqual('commit.protected');
      }
    })

    it("should require protected be a string", () => {
      try {
        new SimpleCommit({
          protected: 1,
          payload: 'foo',
        });
        fail('did not throw');
      } catch (err) {
        if (!(err instanceof HubError)) {
          fail(err.message)
        }
        expect(err.property).toEqual('commit.protected');
      }
    });

    const validCommit = {
      interface: 'Test',
      context: 'example.com',
      type: 'test',
      operation: 'create',
      committed_at: new Date(Date.now()).toISOString(),
      commit_strategy: 'basic',
      sub: 'did:example:alice.id',
      kid: 'did:example:alice.id#key-1',
    };
    for (const property in validCommit) {
      it(`should require protected header ${property}`, () => {
        let improperCommit: any = Object.assign({}, validCommit);
        delete improperCommit[property];
        let stringHeaders = base64url.encode(JSON.stringify(improperCommit));
        try {
          new SimpleCommit({
            protected: stringHeaders,
            payload: 'foo',
          });
          fail(`did not throw when missing ${property}`);
        } catch (err) {
          if (!(err instanceof HubError)) {
            fail(err.message);
          }
          expect(err.property).toEqual(`commit.protected.${property}`);
        }
      });
    }

    ['update', 'delete'].forEach((operation) => {
      it(`should ensure ${operation} have object_id`, () => {
          const improperCommit: any = Object.assign({}, validCommit);
          improperCommit.operation = operation;
          const stringHeaders = base64url.encode(JSON.stringify(improperCommit));
          try {
            new SimpleCommit({
              protected: stringHeaders,
              payload: 'foo',
            });
            fail(`did not throw when missing object_id for ${operation}`);
          } catch (err) {
            if (!(err instanceof HubError)) {
              fail(err.message);
            }
            expect(err.property).toEqual('commit.protected.object_id');
            expect(err.developerMessage).toEqual(DeveloperMessage.MissingParameter);
          }
        });
      it(`should ensure object_id for ${operation} is a string`, async () => {
        const improperCommit: any = Object.assign({}, validCommit);
        improperCommit.operation = operation;
        improperCommit['object_id'] = true;
        const stringHeaders = base64url.encode(JSON.stringify(improperCommit));
        try {
          new SimpleCommit({
            protected: stringHeaders,
            payload: 'foo',
          });
          fail(`did not throw when object_id was a boolean for ${operation}`);
        } catch (err) {
          if (!(err instanceof HubError)) {
            fail(err.message);
          }
          expect(err.property).toEqual('commit.protected.object_id');
          expect(err.developerMessage).toEqual(DeveloperMessage.IncorrectParameter);
        }
      });
    });

    it('should throw for unknown operations', () => {
      try {
        const operation = TestUtilities.randomString();
        const protectedString = base64url.encode(JSON.stringify({
            operation,
            interface: 'Test',
            context: 'example.com',
            type: 'test',
            committed_at: new Date(Date.now()).toISOString(),
            commit_strategy: 'basic',
            sub: 'did:example:alice.id',
            kid: 'did:example:alice.id#key-1',
          }));
        new SimpleCommit({
          'protected': protectedString,
          payload: 'foo',
        });
        fail(`did not throw when operation was ${operation}`);
      } catch (err) {
        if (!(err instanceof HubError)) {
          fail(err.message);
        }
        expect(err.property).toEqual('commit.protected.operation');
      }
    });
    
    it("should require payload", () => {
      const protectedString = base64url.encode(JSON.stringify({
          interface: 'Test',
          context: 'example.com',
          type: 'test',
          operation: Operation.Create,
          committed_at: new Date(Date.now()).toISOString(),
          commit_strategy: 'basic',
          sub: 'did:example:alice.id',
          kid: 'did:example:alice.id#key-1',
        }));
      try {
        new SimpleCommit({
          protected: protectedString,
        });
        fail('did not throw');
      } catch (err) {
        if (!(err instanceof HubError)) {
          fail(err.message)
        }
        expect(err.property).toEqual('commit.payload');
      }
    })

    it("should require payload be a string", () => {
      const protectedString = base64url.encode(JSON.stringify({
          interface: 'Test',
          context: 'example.com',
          type: 'test',
          operation: Operation.Create,
          committed_at: new Date(Date.now()).toISOString(),
          commit_strategy: 'basic',
          sub: 'did:example:alice.id',
          kid: 'did:example:alice.id#key-1',
        }));
      try {
        new SimpleCommit({
          protected: protectedString,
          payload: 1,
        });
        fail('did not throw');
      } catch (err) {
        if (!(err instanceof HubError)) {
          fail(err.message)
        }
        expect(err.property).toEqual('commit.payload');
      }
    });

    it('should throw if Create includes an object_id', () => {
      const protectedString = base64url.encode(JSON.stringify({
        interface: 'Test',
        context: 'example.com',
        type: 'test',
        operation: Operation.Create,
        committed_at: new Date(Date.now()).toISOString(),
        commit_strategy: 'basic',
        sub: 'did:example:alice.id',
        kid: 'did:example:alice.id#key-1',
        object_id: 'The hash of this entire document, somehow'
      }));
      try {
        new SimpleCommit({
          protected: protectedString,
          payload: 'foo',
        });
        fail('did not throw');
      } catch (err) {
        if (!(err instanceof HubError)) {
          fail(err.message)
        }
        expect(err.property).toEqual('commit.protected.object_id');
      }
    });
  
    it('should throw if rev is in the protected headers', () => {
      const protectedString = base64url.encode(JSON.stringify({
        interface: 'Test',
        context: 'example.com',
        type: 'test',
        operation: Operation.Create,
        committed_at: new Date(Date.now()).toISOString(),
        commit_strategy: 'basic',
        sub: 'did:example:alice.id',
        kid: 'did:example:alice.id#key-1',
        rev: 'The hash of this entire document, somehow'
      }));
      try {
        new SimpleCommit({
          protected: protectedString,
          payload: 'foo',
        });
        fail('did not throw');
      } catch (err) {
        if (!(err instanceof HubError)) {
          fail(err.message)
        }
        expect(err.property).toEqual('commit.protected.rev');
      }
    });

    it('should calculate revision correctly', () => {
      const commit = new SimpleCommit({
        protected: 'eyJpbnRlcmZhY2UiOiJUZXN0IiwiY29udGV4dCI6ImV4YW1wbGUuY29tIiwidHlwZSI6InRlc3QiLCJvcGVyYXRpb24iOiJjcmVhdGUiLCJjb21taXR0ZWRfYXQiOiIyMDE4LTEyLTE4VDAxOjA4OjM4LjY2MFoiLCJjb21taXRfc3RyYXRlZ3kiOiJiYXNpYyIsInN1YiI6ImRpZDpleGFtcGxlOmFsaWNlLmlkIiwia2lkIjoiZGlkOmV4YW1wbGU6YWxpY2UuaWQja2V5LTEifQ',
        payload: 'foo',
      });
      expect(commit.getHeaders().rev).toBeDefined();
      expect(commit.getHeaders().rev).toEqual('dd519a3befc001a25e098c04ed6a6064e309ba63fba75e10ab024e0a8b43ca52');
    })
  });
});