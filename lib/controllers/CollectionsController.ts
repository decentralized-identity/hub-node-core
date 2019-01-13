import BaseController from './BaseController';
import WriteRequest from '../models/WriteRequest';
import WriteResponse from '../models/WriteResponse';
import PermissionGrant from '../models/PermissionGrant';
import StoreUtils from '../utilities/StoreUtils';
/**
 * This class handles all the collection requests.
 */
export default class CollectionsController extends BaseController {
  async handleWriteCommitRequest(request: WriteRequest, grants: PermissionGrant[]): Promise<WriteResponse> {
    await StoreUtils.validateObjectExists(request, this.context.store, grants);
    return StoreUtils.writeCommit(request, this.context.store);
  }
}
