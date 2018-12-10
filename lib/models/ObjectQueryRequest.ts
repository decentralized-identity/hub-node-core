import BaseRequest from './BaseRequest';
import HubError from './HubError';
import { QueryFilter } from '../interfaces/Store';

/**
 * A hub request of type ObjectQueryRequest
 */
export default class ObjectQueryRequest extends BaseRequest {
  /** The interface being queried */
  readonly interface: string;
  /** The context being queried */
  readonly queryContext: string;
  /** The type being queried */
  readonly queryType: string;
  /** Optional object Ids to filter on */
  readonly objectIds?: string[];
  /** Optional metadata filters to use */
  readonly filters?: QueryFilter[];
  /** Optional skip token, if included in the request */
  readonly skipToken?: string;

  constructor(json: string | any) {
    super(json);
    this.type = 'ObjectQueryRequest';
    let request = json;
    if (typeof json === 'string') {
      request = JSON.parse(json);
    }
    // validate the input
    if (!('query' in request)) {
      throw HubError.missingParameter('query');
    }
    if (typeof request.query !== 'object') {
      throw HubError.incorrectParameter('query');
    }
    ['interface', 'context', 'type'].forEach((property) => {
      if (!(property in request.query)) {
        throw HubError.missingParameter(`query.${property}`);
      }
      if (typeof request.query[property] !== 'string') {
        throw HubError.incorrectParameter(`query.${property}`);
      }
    });
    this.interface = request.query.interface;
    this.queryContext = request.query.context;
    this.queryType = request.query.type;
    // if object_id filter is used
    if ('object_id' in request.query) {
      if (typeof request.query.object_id !== 'object' ||
          !Array.isArray(request.query.object_id)) {
        throw HubError.incorrectParameter('query.object_id');
      }
      request.query.object_id.forEach((objectId: any, index: number) => {
        if (typeof objectId !== 'string') {
          throw HubError.incorrectParameter(`query.object_id[${index}]`);
        }
      });
      this.objectIds = request.query.object_id;
    }
    // if filters are used
    if ('filters' in request.query) {
      if (typeof request.query.filters !== 'object' ||
          !Array.isArray(request.query.filters)) {
        throw HubError.incorrectParameter('query.filters');
      }
      request.query.filters.forEach((filter: any, index: number) => {
        if (typeof filter !== 'object') {
          throw HubError.incorrectParameter(`query.filters[${index}]`);
        }
        ['type', 'field', 'value'].forEach((property) => {
          if (!(property in filter)) {
            throw HubError.missingParameter(`query.filters[${index}].${property}`);
          }
          if (typeof filter[property] !== 'string') {
            throw HubError.incorrectParameter(`query.filters[${index}].${property}`);
          }
        });
      });
      this.filters = request.query.filters;
    }
    // if skip_token is included
    if ('skip_token' in request.query) {
      if (typeof request.query.skip_token !== 'string') {
        throw HubError.incorrectParameter('query.skip_token');
      }
      this.skipToken = request.query.skip_token;
    }
  }
}
