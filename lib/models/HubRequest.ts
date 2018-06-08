import HubError from '../models/HubError';
import * as HttpStatus from 'http-status';

/**
 * Represents a request to the Hub.
 */
export default class HubRequest {
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
   * Gets the action portion of the @type property.
   * E.g. If @type is "Collections/Add", "Add" is returned.
   */
  public getAction(): string {
    return this['@type'].toLowerCase().split('/')[0];
  }

  /**
   * Translates an incoming request body into an Hub request object.
   */
  constructor(body: any) {
    // Required properties
    ['iss', 'aud', '@type'].forEach(property => {
      if (!body[property])
        throw new HubError(`Request must specify the '${property}' field.`, HttpStatus.BAD_REQUEST);
    });

    this.aud = body.aud;
    this.iss = body.iss;

    let [type, method] = body['@type'].toLowerCase().split('/');
    [type, method].forEach(property => {
      if (!property || property.length == 0)
        throw new HubError('Request must specify a valid @type.', HttpStatus.BAD_REQUEST);
    });
    this["@type"] = body['@type'];

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
          if (body.payload.meta[property])
            (this as any).payload.meta[property] = body.payload.meta[property];
        });
      }
    }
  }
}
