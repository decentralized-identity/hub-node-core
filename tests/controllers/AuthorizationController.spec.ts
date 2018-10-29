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
    });

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
      const permission: StoredObject = {
        owner,
        schema: PERMISSION_GRANT_SCHEMA,
        id: Math.round(Math.random() * Number.MAX_SAFE_INTEGER).toString(16),
        payload: {
          owner,
          grantee: sender,
          allow: allowString,
          object_type: schema,
          created_by: '*',
        } as PermissionGrant,
      };
      store.and.returnValues([permission]);
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
  });
});