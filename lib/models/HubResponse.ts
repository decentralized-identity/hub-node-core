import * as HttpStatus from 'http-status';
import { StoredObject } from '../interfaces/Store';
import HubError from './HubError';

/**
 * Represents a response to a request to the Hub.
 */
export default class HubResponse {
  private objects?: StoredObject[];
  private error?: Error;
  private success?: boolean;

  /**
   * Creates a response object with the given Hub objects.
   */
  static withObjects(objects: StoredObject[]): HubResponse {
    return new HubResponse().setObjects(objects);
  }

  /**
   * Creates a response object with the given Hub object.
   */
  static withObject(obj: StoredObject): HubResponse {
    return new HubResponse().setObject(obj);
  }

  /**
   * Creates a response object with the given error.
   */
  static withError(err: Error): HubResponse {
    return new HubResponse().setError(err);
  }

  /**
   * Creates a response object with the success flag.
   */
  static withSuccess(): HubResponse {
    return new HubResponse().setOperationSucceeded();
  }

  /**
   * Sets the returned objects in this response and returns this response object.
   */
  private setObjects(objects: StoredObject[]): HubResponse {
    this.objects = objects;
    return this;
  }

  /**
   * Sets a returned object in this response and returns this response object.
   */
  private setObject(obj: StoredObject): HubResponse {
    return this.setObjects([obj]);
  }

  /**
   * Sets the error in this response and returns this response object.
   */
  private setError(err: Error): HubResponse {
    this.error = err;
    return this;
  }

  /**
   * Sets the success flag in this response to true and returns this response object.
   */
  private setOperationSucceeded(): HubResponse {
    this.success = true;
    return this;
  }

  /**
   * Gets the response body.
   */
  getResponseBody(): any {
    if (this.objects) {
      return {
        payload: this.objects.map((obj) => {
          return {
            meta: {
              id: obj.id,
            },
            data: obj.payload,
          };
        }),
      };
    }
    if (this.success) {
      return {
        payload: { success: true },
      };
    }
    if (this.error) {
      return {
        error: {
          message: this.error.message,
        },
      };
    }
    return null;
  }

  /**
   * Gets the response code.
   */
  getResponseCode(): number {
    if (this.error) {
      return this.error instanceof HubError ? this.error.httpStatusCode : HttpStatus.INTERNAL_SERVER_ERROR;
    }
    return HttpStatus.OK;
  }
}
