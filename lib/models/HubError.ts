import ErrorResponse from './ErrorResponse';

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

/**
 * Common Developer Messages
 */
export enum DeveloperMessage {
  MissingParameter = 'Required parameter is missing',
  IncorrectParameter = 'Required parameter is of the incorrect type',
  NotImplemented = 'Not Implemented',
  AlreadyExists = 'Already exists',
}

interface HubErrorOptions {
  errorCode: ErrorCode;
  property?: string;
  developerMessage?: string;
  userMessage?: string;
}

/**
 * Standardized Error class for throwing errors in this project.
 */
export default class HubError extends Error {
  /** A standard error code value */
  readonly errorCode: ErrorCode;
  /** The property in the request that caused error */
  readonly property?: string;
  /** Optional developer message */
  readonly developerMessage?: string;
  /** Message to the user */
  readonly userMessage?: string;
  /** ISO datetime at which this Error was created */
  readonly timestamp: string;

  constructor(options: HubErrorOptions) {
    super(options.userMessage);
    this.timestamp = new Date().toISOString();

    // NOTE: Extending 'Error' breaks prototype chain since TypeScript 2.1.
    // The following line restores prototype chain.
    Object.setPrototypeOf(this, new.target.prototype);

    this.errorCode = options.errorCode;
    for (const property in options) {
      (this as any)[property] = (options as any)[property];
    }
  }

  /**
   * Forms an ErrorResponse using this Error
   */
  toResponse(): ErrorResponse {
    let developerMessage = this.developerMessage;
    if (!developerMessage) {
      switch (this.errorCode) {
        case ErrorCode.NotImplemented:
          developerMessage = DeveloperMessage.NotImplemented;
          break;
      }
    }
    return new ErrorResponse({
      developerMessage,
      errorCode: this.errorCode,
      target: this.property,
      userMessage: this.userMessage,
      innerError: {
        timestamp: this.timestamp,
        stacktrace: this.stack,
      },
    });
  }

  /** returns an incorrect type for parameter error */
  public static incorrectParameter(property: string): HubError {
    return new HubError({
      property,
      errorCode: ErrorCode.BadRequest,
      developerMessage: DeveloperMessage.IncorrectParameter,
    });
  }

  /** returns a missing parameter error */
  public static missingParameter(property: string): HubError {
    return new HubError({
      property,
      errorCode: ErrorCode.BadRequest,
      developerMessage: DeveloperMessage.MissingParameter,
    });
  }

  /** returns a not implemented error */
  public static notImplemented(): HubError {
    return new HubError({
      errorCode: ErrorCode.NotImplemented,
    });
  }

}
