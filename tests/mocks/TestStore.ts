import Store, {
  StoredObject,
  CreateDocumentOptions,
  QueryDocumentsOptions,
  UpdateDocumentOptions,
  DeleteDocumentOptions} from '../../lib/interfaces/Store';

export default class TestStore implements Store {
  createDocument(_: CreateDocumentOptions): Promise<StoredObject> {
    return Promise.reject(null);
  }
  queryDocuments(_: QueryDocumentsOptions): Promise<StoredObject[]> {
    return Promise.reject(null);
  }
  updateDocument(_: UpdateDocumentOptions): Promise<StoredObject> {
    return Promise.reject(null);
  }
  deleteDocument(_: DeleteDocumentOptions): Promise<void> {
    return Promise.reject(null);
  }
}
