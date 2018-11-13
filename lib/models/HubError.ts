import ErrorResponse, { ErrorCode } from './ErrorResponse';

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
    return new ErrorResponse({
      errorCode: this.errorCode,
      target: this.property,
      developerMessage: this.developerMessage,
      userMessage: this.userMessage,
      innerError: {
        timestamp: this.timestamp,
        stacktrace: this.stack,
      },
    });
  }
}
