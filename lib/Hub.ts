import * as HttpStatus from 'http-status';
import { Authentication } from '@decentralized-identity/did-auth-jose';
import Context from './interfaces/Context';
import HttpResponse from './models/HttpResponse';
import HubRequest from './models/HubRequest';
import HubResponse from './models/HubResponse';

// Controller classes.
import BaseController from './controllers/BaseController';
import ActionsController from './controllers/ActionsController';
import CollectionsController from './controllers/CollectionsController';
import PermissionsController from './controllers/PermissionsController';
import ProfileController from './controllers/ProfileController';
import AuthorizationController from './controllers/AuthorizationController';
import { Store } from './index';

/**
 * Core class that handles Hub requests.
 * TODO: Formalize Hub error handling then remove all references to HTTP - Hub request handling should be completely independent of HTTP.
 */
export default class Hub {
  /**
   * Map of controllers that can be selected based on the interface name.
   */
  private _controllers: { [name: string]: BaseController };

  private _authentication: Authentication;

  /**
   * Hub constructor.
   *
   * @param context Components for initializing the Hub.
   */
  public constructor(private context: Context) {
    const authorization = Hub.getNewAuthorizationController(this.context.store);
    this._controllers = {
      collections: new CollectionsController(this.context, authorization),
      actions: new ActionsController(this.context, authorization),
      permissions: new PermissionsController(this.context, authorization),
      profile: new ProfileController(this.context, authorization),
    };

    this._authentication = new Authentication({
      resolver: this.context.resolver,
      keys: this.context.keys,
      cryptoSuites: this.context.cryptoSuites,
    });
  }

  // Used for unit test overrides
  private static getNewAuthorizationController(store: Store): AuthorizationController {
    return new AuthorizationController(store);
  }

  /**
   * Handles the incoming request.
   *
   * @param request The raw request buffer.
   */
  public async handleRequest(request: Buffer): Promise<HttpResponse> {
    // Try decrypt the payload and validate signature,
    // Respond with bad request if unable to identify the requester.
    let verifiedRequest;
    try {
      verifiedRequest = await this._authentication.getVerifiedRequest(request);
    } catch (error) {
      // TODO: Proper error logging with logger, for now logging to console.
      console.log(error);
      return {
        statusCode: HttpStatus.BAD_REQUEST,
        body: Buffer.from(''),
      };
    }

    // NOTE: Requester is identified if code reaches here.
    // if the plaintext is a buffer, auth is attempting to send back a fully formed token
    if (verifiedRequest instanceof Buffer) {
      return {
        statusCode: HttpStatus.OK,
        body: verifiedRequest,
      };
    }

    try {
      // If we get here, it means the Hub access token received is valid, proceed with handling the request.
      const requestJson = JSON.parse(verifiedRequest.request);
      const hubRequest = new HubRequest(requestJson);
      const controller = this._controllers[hubRequest.getInterface()];
      const hubResponse = await controller.handle(hubRequest);

      hubResponse.setInterfaceName(hubRequest.getInterface());

      // Sign then encrypt the response.
      const hubResponseBody = hubResponse.getResponseBody();
      const responseBuffer = await this._authentication.getAuthenticatedResponse(verifiedRequest, hubResponseBody);

      return {
        statusCode: HttpStatus.OK,
        body: responseBuffer,
      };
    } catch (error) {
      // TODO: Consider defining Hub response code as part of the body.
      const hubResponse = HubResponse.withError(error);
      const hubResponseBody = hubResponse.getResponseBody();
      console.log(error);

      // Sign then encrypt the error response.
      const responseBuffer = await this._authentication.getAuthenticatedResponse(verifiedRequest, hubResponseBody);

      return {
        statusCode: HttpStatus.OK,
        body: responseBuffer,
      };
    }
  }
}
