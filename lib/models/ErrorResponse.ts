import BaseResponse from './BaseResponse';

/**
 * Standard error codes
 */
export enum ErrorCode {
  BadRequest = 'bad_request',
  AuthenticationFailed = 'authentication_failed',
  PermissionsRequired = 'permissions_required',
  NotFound = 'not_found',
  TooManyRequests = 'too_many_requests',
  ServerError = 'server_error',
  NotImplemented = 'not_implemented',
  ServiceUnavailable = 'service_unavailable',
  TemporarilyUnavailable = 'temporarily_unavailable',
}

/** Parameters to create an ErrorResponse */
interface ErrorResponseOptions {
  errorCode: ErrorCode;
  target?: string;
  errorUrl?: string;
  developerMessage?: string;
  userMessage?: string;
  innerError?: any;
}

/**
 * A hub response for type ErrorResponse
 */
export default class ErrorResponse extends BaseResponse {
  /** A standard error code value */
  readonly errorCode: string;
  /** A resolvable url for more information */
  readonly errorUrl?: string;
  /** Error messages to the user */
  readonly userMessage?: string;
  /** The property in the request that caused error */
  readonly target?: string;
  /** Custom hub provider error information */
  readonly innerError?: any;

  constructor(options: ErrorResponseOptions) {
    super(options.developerMessage);
    this.type = 'ErrorResponse';
    this.errorCode = options.errorCode;
    // copy any additional properties
    for (const property in options) {
      (this as any)[property] = (options as any)[property];
    }
  }

  protected toJson(): any {
    const json = super.toJson();
    Object.assign(json, {
      error_code: this.errorCode,
      error_url: this.errorUrl,
      user_message: this.userMessage,
      target: this.target,
      inner_error: this.innerError,
    });
    return json;
  }
}
