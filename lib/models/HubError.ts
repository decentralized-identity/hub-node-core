import { HubErrorCode } from '@decentralized-identity/hub-common-js';
import ErrorResponse from './ErrorResponse';

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
  errorCode: HubErrorCode;
  property?: string;
  developerMessage?: string;
  userMessage?: string;
}

/**
 * Standardized Error class for throwing errors in this project.
 */
export default class HubError extends Error {

  /** A standard error code value */
  readonly errorCode: HubErrorCode;

  /** The property in the request that caused error */
  readonly property?: string;

  /** (Optional) developer message */
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
        case HubErrorCode.NotImplemented:
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
      errorCode: HubErrorCode.BadRequest,
      developerMessage: DeveloperMessage.IncorrectParameter,
    });
  }

  /** returns a missing parameter error */
  public static missingParameter(property: string): HubError {
    return new HubError({
      property,
      errorCode: HubErrorCode.BadRequest,
      developerMessage: DeveloperMessage.MissingParameter,
    });
  }

  /** returns a not implemented error */
  public static notImplemented(): HubError {
    return new HubError({
      errorCode: HubErrorCode.NotImplemented,
    });
  }

  /** returns a permission required error */
  public static permissionRequired(): HubError {
    return new HubError({
      errorCode: HubErrorCode.PermissionsRequired,
    });
  }

  /** returns a not found error */
  public static notFound(): HubError {
    return new HubError({
      errorCode: HubErrorCode.NotFound,
    });
  }

}
