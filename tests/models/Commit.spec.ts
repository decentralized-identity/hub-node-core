import base64url from 'base64url';
import Commit, { Operation } from '../../lib/models/Commit';
import HubError, { DeveloperMessage } from '../../lib/models/HubError';

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
        let stringHeaders = base64url.encode(JSON.stringify(improperCommit));
        try {
          new SimpleCommit({
            protected: stringHeaders,
            payload: 'foo',
          });
          fail(`did not throw when missing object_id for ${property}`);
        } catch (err) {
          if (!(err instanceof HubError)) {
            fail(err.message);
          }
          expect(err.property).toEqual('commit.protected.object_id');
          expect(err.developerMessage).toEqual(DeveloperMessage.MissingParameter);
        }
      improperCommit['object_id'] = true;
        stringHeaders = base64url.encode(JSON.stringify(improperCommit));
        try {
          new SimpleCommit({
            protected: stringHeaders,
            payload: 'foo',
          });
          fail(`did not throw when object_id was a string for ${property}`);
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
        const operation = Math.round(Math.random() * Number.MAX_SAFE_INTEGER).toString(16);
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
  })
})

// operation = ['update', 'delete']
// it(`should throw if ${operation} does not contain an object_id`, async () => {
//   try {
//     const request = TestRequest.createWriteRequest({
//       interface: 'Collections',
//       operation,
//       override_no_object_id: true,
//     });
//     await controller.handleWriteCommitRequest(request, TestUtilities.allowPermissionGrants);
//     fail('did not throw!');
//   } catch (err) {
//     if (!(err instanceof HubError)) {
//       fail(err.message);
//     }
//     expect(err.errorCode).toEqual(ErrorCode.BadRequest);
//     expect(err.property).toEqual('commit.protected.object_id');
//     expect(err.developer_message).toEqual(DeveloperMessage.MissingParameter);
//   }
// })
// it('should throw if object_id is included in the protected headers for create', async () => {
//   const spy = spyOn(context.store, 'commit').and.callFake((_: WriteRequest) => {
//     fail('storage was called');
//   });
//   try {
//     await controller.handleWriteCommitRequest(TestRequest.createWriteRequest({
//       interface: 'Collections',
//       object_id: TestUtilities.randomString()
//     }), TestUtilities.allowPermissionGrants);
//   } catch (err) {
//     if (!(err instanceof HubError)) {
//       fail(err.message);
//     }
//     expect(err.property).toEqual('commit.protected.object_id');
//   }
//   expect(spy).not.toHaveBeenCalled();
// });