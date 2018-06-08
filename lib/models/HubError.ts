import * as HttpStatus from 'http-status';

/**
 * Standardized Error class for throwing errors in this project.
 */
export default class HubError extends Error {
  constructor(message: string, public httpStatusCode: number = HttpStatus.INTERNAL_SERVER_ERROR) {
    super(message);

    // NOTE: Extending 'Error' breaks prototype chain since TypeScript 2.1.
    // The following line restores prototype chain.
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
