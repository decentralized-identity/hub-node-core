import Commit from '../../lib/models/Commit';
import HubError from '../../lib/models/HubError';
import Base64Url from '@decentralized-identity/did-auth-jose/lib/utilities/Base64Url';

class SimpleCommit extends Commit {
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
        });
        fail('did not throw');
      } catch (err) {
        if (!(err instanceof HubError)) {
          fail(err)
        }
        expect(err.property).toEqual('commit.protected');
      }
    })

    
    it("should require protected be a string", () => {
      try {
        new SimpleCommit({
          protected: 1,
        });
        fail('did not throw');
      } catch (err) {
        if (!(err instanceof HubError)) {
          fail(err)
        }
        expect(err.property).toEqual('commit.protected');
      }
    });

    it('should check for required properties', () => {
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
        let improperCommit: any = Object.assign({}, validCommit);
        delete improperCommit[property];
        let stringHeaders = Base64Url.encode(JSON.stringify(improperCommit));
        try {
          new SimpleCommit({
            protected: stringHeaders,
          });
          fail(`did not throw when missing ${property}`);
        } catch (err) {
          if (!(err instanceof HubError)) {
            fail(err.message);
          }
          expect(err.property).toEqual(`commit.protected.${property}`);
        }
      }
    });

    it('should ensure update and delete have object_id', () => {
      const validCommit = {
        interface: 'Test',
        context: 'example.com',
        type: 'test',
        committed_at: new Date(Date.now()).toISOString(),
        commit_strategy: 'basic',
        sub: 'did:example:alice.id',
        kid: 'did:example:alice.id#key-1',
      };
      ['update', 'delete'].forEach((property) => {
        let improperCommit: any = Object.assign({}, validCommit);
        improperCommit['operation'] = property;
        let stringHeaders = Base64Url.encode(JSON.stringify(improperCommit));
        try {
          new SimpleCommit({
            protected: stringHeaders,
          });
          fail(`did not throw when missing object_id for ${property}`);
        } catch (err) {
          if (!(err instanceof HubError)) {
            fail(err.message);
          }
          expect(err.property).toEqual('commit.protected.object_id');
        }
      });
    });

    it('should throw for unknown operations', () => {
      try {
        const operation = Math.round(Math.random() * Number.MAX_SAFE_INTEGER).toString(16);
        const protectedString = Base64Url.encode(JSON.stringify({
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
        });
        fail(`did not throw when operation was ${operation}`);
      } catch (err) {
        if (!(err instanceof HubError)) {
          fail(err.message);
        }
        expect(err.property).toEqual('commit.protected.operation');
      }
    })
  })
})