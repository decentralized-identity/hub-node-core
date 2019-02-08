import BaseResponse from './BaseResponse';
import { IHubErrorResponse, HubErrorCode } from '@decentralized-identity/hub-common-js';

/** Parameters to create an ErrorResponse */
interface ErrorResponseOptions {
  errorCode: HubErrorCode;
  target?: string;
  errorUrl?: string;
  developerMessage?: string;
  userMessage?: string;
  innerError?: any;
}

/**
 * A hub response for type ErrorResponse
 */
export default class ErrorResponse extends BaseResponse<'ErrorResponse'> {

  /** A standard error code value */
  readonly errorCode: HubErrorCode;

  /** A resolvable url for more information */
  readonly errorUrl?: string;

  /** Error messages to the user */
  readonly userMessage?: string;

  /** The property in the request that caused error */
  readonly target?: string;

  /** Custom hub provider error information */
  readonly innerError?: any;

  constructor(options: ErrorResponseOptions) {
    super('ErrorResponse', options.developerMessage);

    this.errorCode = options.errorCode;

    // copy any additional properties
    for (const property in options) {
      (this as any)[property] = (options as any)[property];
    }
  }

  protected toJson(): IHubErrorResponse {
    return Object.assign(super.toJson(), {
      error_code: this.errorCode,
      error_url: this.errorUrl,
      user_message: this.userMessage,
      target: this.target,
      inner_error: this.innerError,
    });
  }
}
