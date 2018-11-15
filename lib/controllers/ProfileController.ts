import BaseController from './BaseController';
import HubError, { ErrorCode } from '../models/HubError';
import WriteResponse from '../models/WriteResponse';
import WriteRequest from '../models/WriteRequest';
import ObjectQueryRequest from '../models/ObjectQueryRequest';
import ObjectQueryResponse from '../models/ObjectQueryResponse';

/**
 * This class handles all the profile requests.
 */
export default class ProfileController extends BaseController {
  async handleCreateRequest(_: WriteRequest): Promise<WriteResponse> {
    throw new HubError({ errorCode: ErrorCode.NotImplemented });
  }

  async handleQueryRequest(_: ObjectQueryRequest): Promise<ObjectQueryResponse> {
    throw new HubError({ errorCode: ErrorCode.NotImplemented });
  }

  async handleDeleteRequest(_: WriteRequest): Promise<WriteResponse> {
    throw new HubError({ errorCode: ErrorCode.NotImplemented });
  }

  async handleUpdateRequest(_: WriteRequest): Promise<WriteResponse> {
    throw new HubError({ errorCode: ErrorCode.NotImplemented });
  }
}
