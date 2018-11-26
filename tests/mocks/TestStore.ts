import Store, { CommitResponse, CommitRequest, ObjectQueryRequest,
  ObjectQueryResponse, CommitQueryRequest, CommitQueryResponse } from '../../lib/interfaces/Store';

export default class TestStore implements Store {
  commit(_: CommitRequest): Promise<CommitResponse> {
    throw new Error('Method not implemented.');
  }
  queryObjects(_: ObjectQueryRequest): Promise<ObjectQueryResponse> {
    throw new Error('Method not implemented.');
  }
  queryCommits(_: CommitQueryRequest): Promise<CommitQueryResponse> {
    throw new Error('Method not implemented.');
  }
}
