import { HubErrorCode } from '@decentralized-identity/hub-common-js';
import BaseController from './BaseController';
import HubError from '../models/HubError';
import WriteRequest from '../models/WriteRequest';
import WriteResponse from '../models/WriteResponse';
import ObjectQueryRequest from '../models/ObjectQueryRequest';
import ObjectQueryResponse from '../models/ObjectQueryResponse';
import PermissionGrant from '../models/PermissionGrant';

export const ACTION_SCHEMA: string = 'http://schema.identity.foundation/Action';

/**
 * This class handles all the action requests.
 */
/* istanbul ignore next */
export default class ActionsController extends BaseController {

  handleWriteCommitRequest(_: WriteRequest, __: PermissionGrant[]): Promise<WriteResponse> {
    throw new HubError({ errorCode: HubErrorCode.NotImplemented });
  }

  async handleQueryRequest(_: ObjectQueryRequest, __: PermissionGrant[]): Promise<ObjectQueryResponse> {
    throw new HubError({ errorCode: HubErrorCode.NotImplemented });
  }
}
