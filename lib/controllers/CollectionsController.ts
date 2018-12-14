import BaseController from './BaseController';
import WriteRequest from '../models/WriteRequest';
import WriteResponse from '../models/WriteResponse';
import HubError from '../models/HubError';
import PermissionGrant from '../models/PermissionGrant';
import StoreUtils from '../utilities/StoreUtils';
import { Operation } from '../models/Commit';

/**
 * This class handles all the collection requests.
 */
export default class CollectionsController extends BaseController {
  async handleWriteCommitRequest(request: WriteRequest, grants: PermissionGrant[]): Promise<WriteResponse> {
    const headers = request.commit.getProtectedHeaders();
    if ((headers.operation === Operation.Update || headers.operation === Operation.Delete) &&
      !await StoreUtils.objectExists(request, this.context.store, grants)) {
      throw HubError.notFound();
    }
    return StoreUtils.writeCommit(request, this.context.store);
  }
}
