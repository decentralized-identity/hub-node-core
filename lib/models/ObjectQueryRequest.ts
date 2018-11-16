import BaseRequest from './BaseRequest';
import HubError, { ErrorCode, DeveloperMessage } from './HubError';

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
  readonly filters?: {
    /** Type of filter */
    type: string;
    /** Metadata property to filter on */
    property: string;
    /** Value the metadata property should be evaluated against */
    value: string;
  }[];
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
      throw new HubError({
        errorCode: ErrorCode.BadRequest,
        property: 'query',
        developerMessage: DeveloperMessage.MissingParameter,
      });
    }
    if (typeof request.query !== 'object') {
      throw new HubError({
        errorCode: ErrorCode.BadRequest,
        property: 'query',
        developerMessage: DeveloperMessage.IncorrectParameter,
      });
    }
    ['interface', 'context', 'type'].forEach((property) => {
      if (!(property in request.query)) {
        throw new HubError({
          errorCode: ErrorCode.BadRequest,
          property: `query.${property}`,
          developerMessage: DeveloperMessage.MissingParameter,
        });
      }
      if (typeof request.query[property] !== 'string') {
        throw new HubError({
          errorCode: ErrorCode.BadRequest,
          property: `query.${property}`,
          developerMessage: DeveloperMessage.IncorrectParameter,
        });
      }
    });
    this.interface = request.query.interface;
    this.queryContext = request.query.context;
    this.queryType = request.query.type;
    // if object_id filter is used
    if ('object_id' in request.query) {
      if (typeof request.query.object_id !== 'object' ||
          !Array.isArray(request.query.object_id)) {
        throw new HubError({
          errorCode: ErrorCode.BadRequest,
          property: 'query.object_id',
          developerMessage: DeveloperMessage.IncorrectParameter,
        });
      }
      request.query.object_id.forEach((objectId: any, index: number) => {
        if (typeof objectId !== 'string') {
          throw new HubError({
            errorCode: ErrorCode.BadRequest,
            property: `query.object_id[${index}]`,
            developerMessage: DeveloperMessage.IncorrectParameter,
          });
        }
      });
      this.objectIds = request.query.object_id;
    }
    // if filters are used
    if ('filters' in request.query) {
      if (typeof request.query.filters !== 'object' ||
          !Array.isArray(request.query.filters)) {
        throw new HubError({
          errorCode: ErrorCode.BadRequest,
          property: 'query.filters',
          developerMessage: DeveloperMessage.IncorrectParameter,
        });
      }
      request.query.filters.forEach((filter: any, index: number) => {
        if (typeof filter !== 'object') {
          throw new HubError({
            errorCode: ErrorCode.BadRequest,
            property: `query.filters[${index}]`,
            developerMessage: DeveloperMessage.IncorrectParameter,
          });
        }
        ['type', 'property', 'value'].forEach((property) => {
          if (!(property in filter)) {
            throw new HubError({
              errorCode: ErrorCode.BadRequest,
              property: `query.filters[${index}].${property}`,
              developerMessage: DeveloperMessage.MissingParameter,
            });
          }
          if (typeof filter[property] !== 'string') {
            throw new HubError({
              errorCode: ErrorCode.BadRequest,
              property: `query.filters[${index}].${property}`,
              developerMessage: DeveloperMessage.IncorrectParameter,
            });
          }
        });
      });
      this.filters = request.query.filters;
    }
    // if skip_token is included
    if ('skip_token' in request.query) {
      if (request.query.skip_token !== 'string') {
        throw new HubError({
          errorCode: ErrorCode.BadRequest,
          property: 'query.skip_token',
          developerMessage: DeveloperMessage.IncorrectParameter,
        });
      }
      this.skipToken = request.query.skip_token;
    }
  }
}
