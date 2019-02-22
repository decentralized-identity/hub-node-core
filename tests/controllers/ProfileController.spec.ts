import { CommitOperation, HubErrorCode, IObjectMetadata } from '@decentralized-identity/hub-common-js';
import TestContext from '../mocks/TestContext';
import TestAuthorization from '../mocks/TestAuthorization';
import ProfileController from '../../lib/controllers/ProfileController';
import WriteRequest from '../../lib/models/WriteRequest';
import HubError from '../../lib/models/HubError';
import { Store } from '../../lib/interfaces/Store';
import StoreUtils from '../../lib/utilities/StoreUtils';
import PermissionGrant, { OWNER_PERMISSION } from '../../lib/models/PermissionGrant';
import WriteResponse from '../../lib/models/WriteResponse';
import BaseRequest from '../../lib/models/BaseRequest';
import TestUtilities from '../TestUtilities';
import TestRequest from '../mocks/TestRequest';

describe('ProfileController', () => {
  const context = new TestContext();
  const auth = new TestAuthorization();
  const controller = new ProfileController(context, auth);
  const profileContext = BaseRequest.context;
  const profileType = TestUtilities.randomString();
  let owner: string;
  let hub: string;
  let sender: string;

  beforeEach(() => {
    owner = `did:example:${TestUtilities.randomString()}`;
    hub = 'did:example:hub';
    sender = `${owner}-not`;
  });

  describe('getProfiles', () => {
    it('should form the correct store query filters', async () => {

      const writeRequest = TestRequest.createWriteRequest({
        iss: sender,
        sub: owner,
        context: profileContext,
        type: profileType,
      });

      const spy = spyOn(context.store, "queryObjects").and.callFake((request: any) => {
        expect(request.owner).toEqual(owner);
        expect(request.filters).toBeDefined();
        expect(request.filters.length).toEqual(3);
        let countFound = 0;
        request.filters.forEach((filter: any) => {
          switch (filter.field) {
            case 'interface':
              expect(filter.type).toEqual('eq');
              expect(filter.value).toEqual('Profile');
              countFound++;
              break;
            case 'context':
              expect(filter.type).toEqual('eq');
              expect(filter.value).toEqual(profileContext);
              countFound++;
              break;
            case 'type':
              expect(filter.type).toEqual('eq');
              expect(filter.value).toEqual(profileType);
              countFound++;
              break;
            default:
              fail('unknown filter used');
          }
        });
        expect(countFound).toEqual(3);
        return {
          results: [],
          pagination: {
            skip_token: null,
          },
        };
      });
      spyOn(StoreUtils, 'writeCommit');
      await controller.handleWriteCommitRequest(writeRequest, []);
      expect(spy).toHaveBeenCalled();
    });
  });

  describe('handleWriteCommitRequest', () => {
    it('should throw if a profile already exists', async () => {
      const spy = spyOn(context.store, 'queryObjects').and.returnValue({
        results: [{
          interface: 'Profile',
          context: profileContext,
          type: profileType,
          id: TestUtilities.randomString(),
          created_by: 'did:example:alice.id',
          created_at: new Date(Date.now()).toISOString(),
          sub: 'did:example:alice.id',
          commit_strategy: 'basic',
          } as IObjectMetadata
        ],
        pagination: {
          skip_token: null,
      }});

      const writeRequest = TestRequest.createWriteRequest({
        iss: sender,
        sub: owner,
        context: profileContext,
        type: profileType,
      });

      try {
        await controller.handleWriteCommitRequest(writeRequest, []);
        fail('did not throw');
      } catch (err) {
        if (!(err instanceof HubError)) {
          fail(err.message);
        }
        expect(err.errorCode).toEqual(HubErrorCode.BadRequest);
      }
      
      expect(spy).toHaveBeenCalled();
    });

    it('should call store if the create is valid', async () => {

      const writeRequest = TestRequest.createWriteRequest({
        iss: sender,
        sub: owner,
        context: profileContext,
        type: profileType
      });
  
      spyOn(context.store, 'queryObjects').and.returnValue({
        results: [],
        pagination: {
          skip_token: null,
        },
      });
      const spy = spyOn(StoreUtils, 'writeCommit').and.callFake((request: WriteRequest, store: Store) => {
        expect(store).toEqual(context.store);
        expect(request).toEqual(writeRequest);
      });
      await controller.handleWriteCommitRequest(writeRequest, []);
      expect(spy).toHaveBeenCalled();
    });

    [CommitOperation.Update, CommitOperation.Delete].forEach((operation) => {
      const permissionMap: { [operation: string]: string} = {
        update: '--U--',
        delete: '---D-',
      };

      it(`should fail ${operation} if the profile does not exist`, async () => {
        const writeRequest = TestRequest.createWriteRequest({
          iss: sender,
          sub: owner,
          context: profileContext,
          type: profileType,
          operation,
          object_id: TestUtilities.randomString(),
        });
  
        const grant: PermissionGrant = {
          owner,
          grantee: sender,
          context: profileContext,
          type: profileType,
          allow: permissionMap[operation]
        };

        const spy = spyOn(StoreUtils, 'objectExists').and.callFake((request: WriteRequest, store: Store, grants: PermissionGrant[]) => {
          expect(grants[0]).toEqual(grant);
          expect(store).toEqual(context.store);
          expect(request).toEqual(writeRequest);
          return false;
        });
        try {
          await controller.handleWriteCommitRequest(writeRequest, [grant]);
        } catch (err) {
          if (!(err instanceof HubError)) {
            fail(err.message);
          }
          expect(err.errorCode).toEqual(HubErrorCode.NotFound);
        }
  
        expect(spy).toHaveBeenCalled();
      });
  
      it(`should ${operation} if the object already exists`, async () => {
        const writeRequest = TestRequest.createWriteRequest({
          iss: owner,
          sub: owner,
          context: profileContext,
          type: profileType,
          operation,
          object_id: TestUtilities.randomString(),
        });
        
        const spy = spyOn(StoreUtils, 'writeCommit').and.callFake((request: WriteRequest, store: Store) => {
          expect(store).toEqual(context.store);
          expect(request).toEqual(writeRequest);
          return new WriteResponse([request.commit.getHeaders().object_id!]);
        });
  
        spyOn(StoreUtils, 'objectExists').and.returnValue(true);
  
        let result = await controller.handleWriteCommitRequest(writeRequest, []);
        expect(result.revisions[0]).toEqual(writeRequest.commit.getHeaders().object_id!);
        expect(spy).toHaveBeenCalled();
      });
    });
  });

  describe('handleQueryRequest', () => {
    const query = TestRequest.createObjectQueryRequest({
      iss: sender,
      aud: hub,
      sub: owner,
      interface: 'Profile',
      context: profileContext,
      type: profileType,
    });

    it('should return empty if no profile exists', async () => {
      const spy = spyOn(context.store, "queryObjects").and.returnValue({
        results: [],
        pagination: {
          skip_token: null,
        },
      });
      const results = await controller.handleQueryRequest(query, []);
      expect(results.objects.length).toEqual(0);
      expect(spy).toHaveBeenCalled();
    });

    it('should return a profile if one exists', async () => {
      const id = TestUtilities.randomString();
      const spy = spyOn(context.store, "queryObjects").and.returnValue({
        results: [{
          interface: 'Profile',
          context: profileContext,
          type: profileType,
          id,
          created_by: owner,
          created_at: new Date(Date.now()).toISOString(),
          sub: owner,
          commit_strategy: 'basic'
          }],
        pagination: {
          skip_token: null,
        },
      });
      const results = await controller.handleQueryRequest(query, [OWNER_PERMISSION]);
      expect(results.objects.length).toEqual(1);
      expect(spy).toHaveBeenCalled();
      expect(results.objects[0].id).toEqual(id);
    });

    it('should return a random profile if multiple exist', async () => {
      const profiles: IObjectMetadata[] = [];
      const count = Math.round(Math.random() * 10) + 1;
      for(let i = 0; i < count; i++) {
        profiles.push({
        interface: 'Profile',
        context: profileContext,
        type: profileType,
        id: TestUtilities.randomString(),
        created_by: owner,
        created_at: new Date(Date.now()).toISOString(),
        sub: owner,
        commit_strategy: 'basic'
        });
      }
      const spy = spyOn(context.store, "queryObjects").and.returnValue({
        results: profiles,
        pagination: {
          skip_token: null,
        },
      });
      const results = await controller.handleQueryRequest(query, []);
      expect(results.objects.length).toEqual(1);
      expect(profiles.includes(results.objects[0])).toBeTruthy();
      expect(spy).toHaveBeenCalled();
    });

    
    it('should return a random profile per schema if multiple exist', async () => {
      const profiles: IObjectMetadata[] = [];
      const count = Math.round(Math.random() * 10) + 1;
      let someType: string = TestUtilities.randomString();
      for(let i = 0; i < count; i++) {
        if (i % 2 == 0) {
          someType = TestUtilities.randomString();
        }
        profiles.push({
        interface: 'Profile',
        context: profileContext,
        type: someType,
        id: TestUtilities.randomString(),
        created_by: owner,
        created_at: new Date(Date.now()).toISOString(),
        sub: owner,
        commit_strategy: 'basic'
        });
      }
      const spy = spyOn(context.store, "queryObjects").and.returnValue({
        results: profiles,
        pagination: {
          skip_token: null,
        },
      });
      const results = await controller.handleQueryRequest(query, []);
      expect(results.objects.length).toEqual(Math.ceil(count / 2));
      expect(spy).toHaveBeenCalled();
    });
  })
});
