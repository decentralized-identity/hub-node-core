import HubRequest from '../models/HubRequest';
import { Store } from '../index';
import PermissionGrant, { PERMISSION_GRANT_SCHEMA } from '../models/PermissionGrant';
import HubError from '../models/HubError';

/**
 * Internal controller for authorizing requests to an Identity Hub
 */
export default class AuthorizationController {

  /** Creates an AuthorizationController using the given Store */
  constructor (private store: Store) {
  }

  /**
   * Checks if a request is authorized
   * @param request HubRequest needing authorization
   * @returns true is authorized, else false
   */
  async authorize(request: HubRequest): Promise<Boolean> {
    // if the request is to their own hub, always allow
    if (request.iss === request.aud) {
      return true;
    }
    const requester = request.iss;
    if (!request.request) {
      throw new HubError('request required');
    }
    const schema = request.request.schema;
    if (!schema) {
      throw new HubError('request.schema required');
    }
    let operation: RegExp;
    switch (request.getAction().toLowerCase()) {
      case 'create':
        operation = /C/;
        break;
      case 'read':
        operation = /R/;
        break;
      case 'update':
        operation = /U/;
        break;
      case 'delete':
        operation = /D/;
        break;
      case 'execute':
        operation = /X/;
        break;
      default:
        throw new HubError('unknown operation', 400);
    }
    const permissions = await this.store.queryDocuments({
      owner: request.aud,
      schema: PERMISSION_GRANT_SCHEMA,
    });
    let permissionFound = false;
    permissions.forEach((permission) => {
      const grant = permission.payload as PermissionGrant;
      if (grant.grantee !== requester ||
         (grant.object_type !== schema) ||
          !operation.test(grant.allow)) {
        return;
      }
      // we found a permission
      permissionFound = true;
    });
    return permissionFound;
  }
}
