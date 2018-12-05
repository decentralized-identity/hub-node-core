import { Authentication } from '@decentralized-identity/did-auth-jose';
import Context from './interfaces/Context';

// Controller classes.
import BaseController from './controllers/BaseController';
import ActionsController from './controllers/ActionsController';
import CollectionsController from './controllers/CollectionsController';
import PermissionsController from './controllers/PermissionsController';
import ProfileController from './controllers/ProfileController';
import HubError, { ErrorCode } from './models/HubError';
import BaseRequest from './models/BaseRequest';
import ObjectQueryRequest from './models/ObjectQueryRequest';
import WriteRequest from './models/WriteRequest';
import BaseResponse from './models/BaseResponse';
import Response from './models/Response';
import AuthorizationController from './controllers/AuthorizationController';
import CommitQueryRequest from './models/CommitQueryRequest';
import CommitController from './controllers/CommitController';

/**
 * Core class that handles Hub requests.
 * TODO: Formalize Hub error handling then remove all references to HTTP - Hub request handling should be completely independent of HTTP.
 */
export default class Hub {
  /**
   * Map of controllers that can be selected based on the interface name.
   */
  private _controllers: { [name: string]: BaseController };

  private _commitController: CommitController;

  private _authentication: Authentication;

  private _authorization: AuthorizationController;

  /**
   * Hub constructor.
   *
   * @param context Components for initializing the Hub.
   */
  public constructor(private context: Context) {
    this._authentication = new Authentication({
      resolver: this.context.resolver,
      keys: this.context.keys,
      cryptoSuites: this.context.cryptoSuites,
    });

    this._authorization = new AuthorizationController(this.context);

    this._controllers = {
      collections: new CollectionsController(this.context, this._authorization),
      actions: new ActionsController(this.context, this._authorization),
      permissions: new PermissionsController(this.context, this._authorization),
      profile: new ProfileController(this.context, this._authorization),
    };
    this._commitController = new CommitController(this.context, this._authorization);
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
        body: Buffer.from(new HubError({
          errorCode: ErrorCode.AuthenticationFailed,
        }).toResponse().toString()),
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
      const request = new BaseRequest(verifiedRequest.request);
      let response: BaseResponse;
      switch (request.getType()) {
        case 'CommitQueryRequest':
          const commitRequest = new CommitQueryRequest(verifiedRequest.request);
          response = await this._commitController.handle(commitRequest);
          break;
        case 'ObjectQueryRequest':
          const queryRequest = new ObjectQueryRequest(verifiedRequest.request);
          const queryController = this._controllers[queryRequest.interface];
          response = await queryController.handle(queryRequest);
          break;
        case 'WriteRequest':
          const writeRequest = new WriteRequest(verifiedRequest.request);
          const writeController = this._controllers[writeRequest.commit.getHeaders().interface];
          response = await writeController.handle(writeRequest);
          break;
        default:
          throw new HubError({
            errorCode: ErrorCode.BadRequest,
            property: '@type',
            developerMessage: `Request format unknown: ${request.getType()}`,
          });
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
