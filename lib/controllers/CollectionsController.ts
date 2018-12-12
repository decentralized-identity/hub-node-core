import BaseController from './BaseController';
import WriteRequest from '../models/WriteRequest';
import WriteResponse from '../models/WriteResponse';
import HubError, { ErrorCode, DeveloperMessage } from '../models/HubError';
import PermissionGrant from '../models/PermissionGrant';
import StoreUtils from '../utilities/StoreUtils';
import { Operation } from '../models/Commit';

/**
 * This class handles all the collection requests.
 */
export default class CollectionsController extends BaseController {
  handleWriteCommitRequest(request: WriteRequest, _: PermissionGrant[]): Promise<WriteResponse> {
    const objectIdShouldBeUndefined = request.commit.getProtectedHeaders().operation === Operation.Create;
    if ((request.commit.getProtectedHeaders().object_id === undefined) === objectIdShouldBeUndefined) {
      if (objectIdShouldBeUndefined) {
        throw new HubError({
          errorCode: ErrorCode.BadRequest,
          developerMessage: DeveloperMessage.AlreadyExists,
        });
      } else {
        throw new HubError({
          errorCode: ErrorCode.NotFound,
        });
      }
    }
    return StoreUtils.writeCommit(request, this.context.store);
  }
}
