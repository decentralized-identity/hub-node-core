import * as HttpStatus from 'http-status';
import Context from './interfaces/Context';
import HubError from './models/HubError';
import HubRequest from './models/HubRequest';
import HubResponse from './models/HubResponse';
import RequestOptions from './interfaces/RequestOptions';

// Controller classes.
import BaseController from './controllers/BaseController';
import ActionsController from './controllers/ActionsController';
import CollectionsController from './controllers/CollectionsController';
import PermissionsController from './controllers/PermissionsController';
import ProfileController from './controllers/ProfileController';

/**
 * Core class that handles Hub requests.
 */
export default class Hub {
  /**
   * Map of controllers that can be selected based on the interface name.
   */
  private _controllers: { [name: string]: BaseController };

  /**
   * Hub constructor.
   * 
   * @param context Components for initializing the Hub.
   */
  public constructor(private context: Context) {
    this._controllers = {
      collections: new CollectionsController(this.context),
      actions: new ActionsController(this.context),
      permissions: new PermissionsController(this.context),
      profile: new ProfileController(this.context),
    };
  }

  /**
   * Handles the incoming request.
   * 
   * @param request The raw request buffer.
   * @param requestOptions The optional request options.
   */
  public async handleRequest(request: Buffer, requestOptions?: RequestOptions): Promise<HubResponse> {
    try {
      if (requestOptions && requestOptions.hubKeyId) {
        throw new HubError('Not implemented.', HttpStatus.NOT_IMPLEMENTED);
      }
  
      const unencryptedRequest = request.toString('utf8');
      const requestJson = JSON.parse(unencryptedRequest);
      const hubRequest = new HubRequest(requestJson);
      const controller = this._controllers[hubRequest.getInterface()];
      const hubResponse = await controller.handle(hubRequest);
  
      return hubResponse;
    }
    catch (error) {
      return HubResponse.withError(error);
    }
  };
}
