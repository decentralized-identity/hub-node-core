import TestStore from '../mocks/TestStore';
import AuthorizationController from '../../lib/controllers/AuthorizationController';
import HubRequest from '../../lib/models/HubRequest';
import { StoredObject } from '../../lib/interfaces/Store';
import PermissionGrant, { PERMISSION_GRANT_SCHEMA } from '../../lib/models/PermissionGrant';

describe('AuthorizationController', () => {
  let store: jasmine.Spy;
  let auth: AuthorizationController;

  beforeEach(() => {
    const testStore = new TestStore();
    store = spyOn(testStore, 'queryDocuments')
    auth = new AuthorizationController(testStore);
  });

  describe('authorize', () => {
    it('should allow did owner without rules', async () => {
      const did = `did:test:${Math.round(Math.random() * Number.MAX_SAFE_INTEGER).toString(16)}`;
      const request = new HubRequest({
        iss: did,
        aud: did,
        '@type': 'unknown/action',
      });
      expect(await auth.authorize(request)).toBeTruthy();
    });

    it('should reject non-owner without rules', async () => {
      const owner = `did:test:${Math.round(Math.random() * Number.MAX_SAFE_INTEGER).toString(16)}`;
      const sender = `${owner}-not`;
      const request = new HubRequest({
        iss: sender,
        aud: owner,
        '@type': 'unknown/create',
        request: {
          schema: 'will not matter here',
        },
      });
      store.and.returnValues([]);
      expect(await auth.authorize(request)).toBeFalsy();
      expect(store).toHaveBeenCalled();
    });

    function createPermissionGrant(owner: string, grantee: string, schema: string, allow: string): StoredObject {
      return {
        owner,
        schema: PERMISSION_GRANT_SCHEMA,
        id: Math.round(Math.random() * Number.MAX_SAFE_INTEGER).toString(16),
        payload: {
          owner,
          grantee,
          allow,
          object_type: schema,
          created_by: '*',
        } as PermissionGrant,
      };
    }

    async function checkPermissionFor(operation: string, allowString: string) {
      const owner = `did:test:${Math.round(Math.random() * Number.MAX_SAFE_INTEGER).toString(16)}`;
      const sender = `${owner}-not`;
      const schema = Math.round(Math.random() * Number.MAX_SAFE_INTEGER).toString(16);
      const request = new HubRequest({
        iss: sender,
        aud: owner,
        '@type': `unknown/${operation}`,
        request: {
          schema,
        },
        payload: {
          data: {
            // nothing needs to be here
          },
        },
      });
      store.and.returnValues([createPermissionGrant(owner, sender, schema, allowString)]);
      expect(await auth.authorize(request)).toBeTruthy();
    }

    it('should accept for create requests', async () => {
      await checkPermissionFor('create', 'C----');
    });
    it('should accept for read requests', async () => {
      await checkPermissionFor('read', '-R---');
    });
    it('should accept for update requests', async () => {
      await checkPermissionFor('update', '--U--');
    });
    it('should accept for delete requests', async () => {
      await checkPermissionFor('delete', '---D-');
    });
    it('should accept for execute requests', async () => {
      await checkPermissionFor('execute', '----X');
    });

    it('should require the request field', async () => {
      const owner = `did:test:${Math.round(Math.random() * Number.MAX_SAFE_INTEGER).toString(16)}`;
      const sender = `${owner}-not`;

      const request = new HubRequest({
        iss: sender,
        aud: owner,
        '@type': 'unknown/create',
        payload: {
          data: {
            // nothing needs to be here
          },
        },
      });

      try {
        await auth.authorize(request);
        fail('Did not require request field');
      } catch (err) {
        expect(err.message).toContain('request');
      }
    });

    it('should require the schema field', async () => {
      const owner = `did:test:${Math.round(Math.random() * Number.MAX_SAFE_INTEGER).toString(16)}`;
      const sender = `${owner}-not`;

      const request = new HubRequest({
        iss: sender,
        aud: owner,
        '@type': 'unknown/create',
        request: {
        },
        payload: {
          data: {
            // nothing needs to be here
          },
        },
      });

      try {
        await auth.authorize(request);
        fail('Did not require schema field');
      } catch (err) {
        expect(err.message).toContain('schema');
      }
    });

    it('should ignore other permission grants by grantee', async() => {
      const owner = `did:test:${Math.round(Math.random() * Number.MAX_SAFE_INTEGER).toString(16)}`;
      const sender = `${owner}-not`;
      const grantee = `${owner}-grantee`;
      const schema = Math.round(Math.random() * Number.MAX_SAFE_INTEGER).toString(16);
      const request = new HubRequest({
        iss: sender,
        aud: owner,
        '@type': 'unknown/create',
        request: {
          schema,
        },
      });
      store.and.returnValues([createPermissionGrant(owner, grantee, schema, 'C----')]);
      expect(await auth.authorize(request)).toBeFalsy();
      expect(store).toHaveBeenCalled();
    });

    it('should ignore other permission grants by schema', async() => {
      const owner = `did:test:${Math.round(Math.random() * Number.MAX_SAFE_INTEGER).toString(16)}`;
      const sender = `${owner}-not`;
      const schema = Math.round(Math.random() * Number.MAX_SAFE_INTEGER).toString(16);
      const permissionSchema = `${schema}-not`;
      const request = new HubRequest({
        iss: sender,
        aud: owner,
        '@type': 'unknown/create',
        request: {
          schema,
        },
      });
      store.and.returnValues([createPermissionGrant(owner, sender, permissionSchema, 'C----')]);
      expect(await auth.authorize(request)).toBeFalsy();
      expect(store).toHaveBeenCalled();
    });

    it('should ignore other permission grants by operation', async() => {
      const owner = `did:test:${Math.round(Math.random() * Number.MAX_SAFE_INTEGER).toString(16)}`;
      const sender = `${owner}-not`;
      const schema = Math.round(Math.random() * Number.MAX_SAFE_INTEGER).toString(16);
      const request = new HubRequest({
        iss: sender,
        aud: owner,
        '@type': 'unknown/create',
        request: {
          schema,
        },
      });
      store.and.returnValues([createPermissionGrant(owner, sender, schema, '-R---')]);
      expect(await auth.authorize(request)).toBeFalsy();
      expect(store).toHaveBeenCalled();
    });

    it('should fail if the operation could not be identified', async() => {
      const owner = `did:test:${Math.round(Math.random() * Number.MAX_SAFE_INTEGER).toString(16)}`;
      const sender = `${owner}-not`;
      const schema = Math.round(Math.random() * Number.MAX_SAFE_INTEGER).toString(16);
      const request = new HubRequest({
        iss: sender,
        aud: owner,
        '@type': 'unknown/unknown',
        request: {
          schema,
        },
      });
      try {
        await auth.authorize(request);
        fail('Did not fail for unknown operation');
      } catch (err) {
        expect(err.message).toContain('operation');
      }
    })
  });
});
