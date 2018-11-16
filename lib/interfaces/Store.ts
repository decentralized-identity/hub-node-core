import Commit from '../models/Commit';

interface QueryFilter {
  type: string;
}

interface QueryEqualsFilter extends QueryFilter {
  type: 'eq';
  field: string;
  value: string|string[];
}

interface QueryRequest {

  // DID of the Hub owner
  owner: string;

  filters?: QueryEqualsFilter[];

  // List of fields to return from the queried items. Currently only supports "rev" or "id"
  // fields?: string[];

  skip_token?: string;

}

interface ObjectQueryRequest extends QueryRequest {

  // filters[] currently accepts 'interface', 'context', 'type', and 'object_id'

  // TODO: Stores needs interface: 'Stores' and store_key: foo.
  // Profile needs ???
}

interface CommitQueryRequest extends QueryRequest {

  // filters[] currently accepts 'object_id' and 'rev'

}

interface QueryResponse<ResultType> {

  results: ResultType[];

  pagination: {
    skip_token: string;
  };

}

// TODO: Define interface for Hub object
interface ObjectQueryResponse extends QueryResponse<any> {

}

interface CommitQueryResponse extends QueryResponse<Commit> {

}

interface CommitRequest {

  // DID of the Hub owner
  owner: string;

  commit: Commit;

}

interface CommitResponse {

  knownRevisions: string[];

}

/**
 * Interface for storing Hub data, which must be implemented by each backing database.
 */
export default interface Store {
  /**
   * Adds one or more Commit objects to the store. This method is idempotent and it is acceptable to
   * pass a previously seen Commit.
   */
  commit(request: CommitRequest): Promise<CommitResponse>;

  /**
   * Queries the store for objects matching the specified filters.
   *
   * @param request A request specifying the details of which objects to query. This query must
   * specify at least an owner DID, may also specify other constraints.
   *
   * @returns A promise for a response containing details of the matching objects, as well as other
   * metadata such as pagination.
   */
  queryObjects(request: ObjectQueryRequest): Promise<ObjectQueryResponse>;

  /**
   * Queries the store for commits matching the specified filters.
   *
   * @param request A request specifying the details of which commits to query. This query must
   * specify at least an owner DID, may also specify other constraints.
   *
   * @returns A promise for a response containing details of the matching commits, as well as other
   * metadata such as pagination.
   */
  queryCommits(request: CommitQueryRequest): Promise<CommitQueryResponse>;
}
