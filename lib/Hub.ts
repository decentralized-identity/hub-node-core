import * as HttpStatus from 'http-status';
import { Authentication } from '@decentralized-identity/did-auth-jose';
import Context from './interfaces/Context';

// Controller classes.
import BaseController from './controllers/BaseController';
import ActionsController from './controllers/ActionsController';
import CollectionsController from './controllers/CollectionsController';
import PermissionsController from './controllers/PermissionsController';
import ProfileController from './controllers/ProfileController';
import HubError, { ErrorCode, DeveloperMessage } from './models/HubError';
import Request from './models/Request';
import BaseRequest from './models/BaseRequest';
import ObjectQueryRequest from './models/ObjectQueryRequest';
import WriteRequest from './models/WriteRequest';
import BaseResponse from './models/BaseResponse';
import Response from './models/Response';

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
    this._controllers = {
      collections: new CollectionsController(this.context),
      actions: new ActionsController(this.context),
      permissions: new PermissionsController(this.context),
      profile: new ProfileController(this.context),
    };

    this._authentication = new Authentication({
      resolver: this.context.resolver,
      keys: this.context.keys,
      cryptoSuites: this.context.cryptoSuites,
    });

  }

  /**
   * Handles the incoming request.
   *
   * @param request The raw request buffer.
   */
  public async handleRequest(request: Buffer): Promise<Response> {
    // Try decrypt the payload and validate signature,
    // Respond with bad request if unable to identify the requester.
    let verifiedRequest;
    try {
      verifiedRequest = await this._authentication.getVerifiedRequest(request);
    } catch (error) {
      // TODO: Proper error logging with logger, for now logging to console.
      console.log(error);
      return {
        ok: false,
        body: Buffer.from(''),
      };
    }

    // NOTE: Requester is identified if code reaches here.
    // if the plaintext is a buffer, auth is attempting to send back a fully formed token
    if (verifiedRequest instanceof Buffer) {
      return {
        ok: true,
        body: verifiedRequest,
      };
    }

    try {
      // If we get here, it means the Hub access token received is valid, proceed with handling the request.
      const request = new Request(verifiedRequest.request);
      let response: BaseResponse;
      if (request.getType() === 'CommitQueryRequest') {
        // Commit requests go directly to the Storage layer
        // TODO: Implement storage commit queries
        throw new HubError({ errorCode: ErrorCode.NotImplemented });
      } else {
        let objectRequest: BaseRequest;
        switch (request.getType()) {
          case 'ObjectQueryRequest':
            objectRequest = new ObjectQueryRequest(verifiedRequest.request);
            break;
          case 'WriteRequest':
            objectRequest = new WriteRequest(verifiedRequest.request);
            break;
          default:
            throw new HubError({
              errorCode: ErrorCode.BadRequest,
              property: '@type',
              developerMessage: DeveloperMessage.IncorrectParameter,
            });
        }

        const controller = this._controllers[objectRequest.interface];
        response = await controller.handle(objectRequest);
      }

      // Sign then encrypt the response.
      const hubResponseBody = response.toString();
      const responseBuffer = await this._authentication.getAuthenticatedResponse(verifiedRequest, hubResponseBody);

      return {
        ok: true,
        body: responseBuffer,
      };
    } catch (error) {
      let hubError: HubError;
      if (error instanceof HubError) {
        hubError = error;
      } else {
        hubError = new HubError({ errorCode: ErrorCode.ServerError });
        hubError.stack = error.stack;
      }
      const hubResponseBody = hubError.toResponse().toString();
      console.log(error);

      // Sign then encrypt the error response.
      const responseBuffer = await this._authentication.getAuthenticatedResponse(verifiedRequest, hubResponseBody);

      return {
        ok: true,
        body: responseBuffer,
      };
    }
  }
}
