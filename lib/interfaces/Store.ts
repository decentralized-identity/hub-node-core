import Commit from '../models/Commit';
import ObjectContainer from './ObjectContainer';

/**
 * Query filter which refines results to those where the specified `field` has the given `value`. If
 * `value` is an array, matches any entry in the array.
 */
export interface QueryEqualsFilter {

  /** Indicates an equality filter. */
  type: 'eq';

  /** Name of metadata field to be evaluated, e.g. `sub` or `commit_strategy`. */
  field: string;

  /** Value or values to search for. */
  value: string | string[];

}

/**
 * Represents all possible types of query filters.
 *
 * This list can be expanded in the future (e.g. `QueryEqualsFilter | QueryLessThanFilter`) when
 * additional filter types are supported.
 */
export type QueryFilter = QueryEqualsFilter;

/**
 * Common parameters for Store requests.
 */
export interface QueryRequest {

  /** The fully-qualified DID of the Hub owner. */
  owner: string;

  /** (Optional) filters to refine the entities returned. */
  filters?: QueryFilter[];

  // List of fields to return from the queried items. Currently only supports "rev" or "id"
  // fields?: string[];

  /** A previously returned pagination token, for iterating through pages of a query. */
  skip_token?: string;

}

/**
 * Store request to query over the objects in a particular Hub.
 *
 * Currently supported filters: 'interface', 'context', 'type', 'object_id'
 */
export interface ObjectQueryRequest extends QueryRequest {
}

/**
 * Store request to query over the individual commits in a particular Hub.
 *
 * Currently supported filters: 'object_id', 'rev'
 */
export interface CommitQueryRequest extends QueryRequest {
}

/**
 * Common parameters for Store responses.
 */
export interface QueryResponse<ResultType> {

  results: ResultType[];

  pagination: {
    skip_token: string | null;
  };

}

/**
 * Response to a query over the objects in a particular Hub.
 */
export interface ObjectQueryResponse extends QueryResponse<ObjectContainer> {

}

/**
 * Response to a query over the individual commits in a particular Hub.
 */
export interface CommitQueryResponse extends QueryResponse<Commit> {

}

/**
 * A request to add a new commit to a Hub.
 */
export interface CommitRequest {

  /** The fully-qualified DID of the Hub owner. */
  owner: string;

  /** The commit to add to the Store. */
  commit: Commit;

}

/**
 * The response to a `CommitRequest`.
 */
export interface CommitResponse {

  /** The list of known revisions for the object that was modified. */
  knownRevisions: string[];

}

/**
 * Interface for storing Hub data, which must be implemented by each backing database.
 */
export interface Store {
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
