import * as HttpStatus from 'http-status';
import HubError from '../models/HubError';

/**
 * Represents a request to the Hub.
 */
export default class HubRequest {
  private _interface: string;
  private _action: string;

  iss: string;
  aud: string;
  '@type': string;

  // Request properties.
  request?: {
    schema?: string;
    key?: string;
    id?: string;
    skip?: number;
    take?: number;
  };

  // Payload for Add/Update.
  payload?: {
    meta?: {
      'cache-intent'?: string;
      title?: string;
      tags?: string[];
    };
    data: any;
  };

  /**
   * Gets the interace portion of the @type property.
   * 
   * @returns Interface portion of the @type property. Always lower case.
   * @example If @type is "Collections/Add", "collections" is returned.
   */
  public getInterface(): string {
    return this._interface;
  }

  /**
   * Gets the action portion of the @type property.
   * 
   * @returns Action portion of the @type property. Always lower case.
   * @example If @type is "Collections/Add", "add" is returned.
   */
  public getAction(): string {
    return this._action;
  }

  /**
   * Translates an incoming request body into a Hub request object.
   */
  constructor(body: any) {
    // Required properties
    ['iss', 'aud', '@type'].forEach(property => {
      if (!body[property]) {
        throw new HubError(`Request must specify the '${property}' field.`, HttpStatus.BAD_REQUEST);
      }
    });

    this.aud = body.aud;
    this.iss = body.iss;

    [this._interface, this._action] = body['@type'].toLowerCase().split('/');
    [this._interface, this._action].forEach(property => {
      if (!property || property.length == 0) {
        throw new HubError('Request must specify a valid @type.', HttpStatus.BAD_REQUEST);
      }
    });
    this['@type'] = body['@type'];

    // Throw error if 'add' or 'update' request does not contain a payload with data.
    if (['add', 'update'].includes(this._action)) {
      if (!body.payload || !body.payload.data) {
        throw new HubError('Add/Update requests must specify the "payload.data" field.', HttpStatus.BAD_REQUEST);
      };
    }

    if (body.request) {
      this.request = {};

      ['schema', 'key', 'id', 'skip', 'take'].forEach(property => {
          (this.request as any)[property] = body.request[property];
      });
    }

    // Only create the payload property if there is payload data.
    if (body.payload && body.payload.data) {
      this.payload = { data: body.payload.data };

      if (body.payload.meta) {
        this.payload.meta = {};
        
        ['cache-intent', 'title', 'tags'].forEach(property => {
          if (body.payload.meta[property]) {
            (this as any).payload.meta[property] = body.payload.meta[property];
          }
        });
      }
    }
  }
}
