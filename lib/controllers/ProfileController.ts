import * as HttpStatus from 'http-status';
import BaseController from './BaseController';
import HubError from '../models/HubError';
import HubRequest from '../models/HubRequest';
import HubResponse from '../models/HubResponse';

/**
 * This class handles all the profile requests.
 */
export default class ProfileController extends BaseController {
  async handleCreateRequest(request: HubRequest): Promise<HubResponse> {
    throw new HubError(`${request.getAction()} handler not implemented.`, HttpStatus.NOT_IMPLEMENTED);
  }

  async handleQueryRequest(request: HubRequest): Promise<HubResponse> {
    throw new HubError(`${request.getAction()} handler not implemented.`, HttpStatus.NOT_IMPLEMENTED);
  }

  async handleDeleteRequest(request: HubRequest): Promise<HubResponse> {
    throw new HubError(`${request.getAction()} handler not implemented.`, HttpStatus.NOT_IMPLEMENTED);
  }

  async handleUpdateRequest(request: HubRequest): Promise<HubResponse> {
    throw new HubError(`${request.getAction()} handler not implemented.`, HttpStatus.NOT_IMPLEMENTED);
  }
}
