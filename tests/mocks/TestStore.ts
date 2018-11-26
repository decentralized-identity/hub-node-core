import Store, { CommitResponse, CommitRequest, ObjectQueryRequest,
  ObjectQueryResponse, CommitQueryRequest, CommitQueryResponse } from '../../lib/interfaces/Store';

export default class TestStore implements Store {
  commit(request: CommitRequest): Promise<CommitResponse> {
    throw new Error('Method not implemented.');
  }
  queryObjects(request: ObjectQueryRequest): Promise<ObjectQueryResponse> {
    throw new Error('Method not implemented.');
  }
  queryCommits(request: CommitQueryRequest): Promise<CommitQueryResponse> {
    throw new Error('Method not implemented.');
  }
}
