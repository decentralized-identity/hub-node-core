import HubError, { ErrorCode, DeveloperMessage } from './HubError';
import Request from './Request';

/**
 * A hub request for type CommitQueryRequest
 */
export default class CommitQueryRequest extends Request {
  /** Ids of objects whos complete commit history should be returned */
  objectIds: string[];
  /** Ids of commits that should be returned */
  revisions: string[];
  /** if provided, restrict returned results to only the listed metadata fields */
  fields: string[];
  /** if provided, the skip token used for continuation */
  skipToken?: string;

  constructor(json: string | any) {
    super(json);
    this.type = 'CommitQueryRequest';
    let request = json;
    if (typeof json === 'string') {
      request = JSON.parse(json);
    }
    if ('query' in request) {
      // check object_id
      if ('object_id' in request.query) {
        const objectIds = request.query.object_id;
        CommitQueryRequest.validateStringArray(objectIds, 'query.object_id');
        this.objectIds = objectIds;
      } else {
        this.objectIds = [];
      }
      // check revisions
      if ('revision' in request.query) {
        const revisions = request.query.revision;
        CommitQueryRequest.validateStringArray(revisions, 'query.revision');
        this.revisions = revisions;
      } else {
        this.revisions = [];
      }
      // check skip_token
      if ('skip_token' in request.query) {
        const skipToken = request.query.skip_token;
        if (typeof skipToken !== 'string') {
          throw new HubError({
            errorCode: ErrorCode.BadRequest,
            property: 'query.skip_token',
            developerMessage: DeveloperMessage.IncorrectParameter,
          });
        }
        this.skipToken = skipToken;
      }
    } else {
      this.objectIds = [];
      this.revisions = [];
    }
    if ('fields' in request) {
      const fields = request.fields;
      CommitQueryRequest.validateStringArray(fields, 'fields');
      this.fields = fields;
    } else {
      this.fields = [];
    }
  }

  /** Checks that the stringArray is an array, and that all elements are strings, else throws a HubError */
  private static validateStringArray(stringArray: any, path: string) {
    if (typeof stringArray !== 'object' ||
        !Array.isArray(stringArray)) {
      throw new HubError({
        errorCode: ErrorCode.BadRequest,
        property: path,
        developerMessage: DeveloperMessage.IncorrectParameter,
      });
    }
    stringArray.forEach((shouldBeString: any, index: number) => {
      if (typeof shouldBeString !== 'string') {
        throw new HubError({
          errorCode: ErrorCode.BadRequest,
          property: `${path}[${index}]`,
          developerMessage: DeveloperMessage.IncorrectParameter,
        });
      }
    });
  }
}
