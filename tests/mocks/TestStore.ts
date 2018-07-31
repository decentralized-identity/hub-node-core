import Store, {
  StoredObject,
  CreateDocumentOptions,
  QueryDocumentsOptions,
  UpdateDocumentOptions,
  DeleteDocumentOptions} from '../../lib/interfaces/Store';

export default class TestStore implements Store {
  createDocument(_: CreateDocumentOptions): Promise<StoredObject> {
    return new Promise((_, reject) => {
      reject();
    });
  }
  queryDocuments(_: QueryDocumentsOptions): Promise<StoredObject[]> {
    return new Promise((_, reject) => {
      reject();
    });
  }
  updateDocument(_: UpdateDocumentOptions): Promise<StoredObject> {
    return new Promise((_, reject) => {
      reject();
    });
  }
  deleteDocument(_: DeleteDocumentOptions): Promise<void> {
    return new Promise((_, reject) => {
      reject();
    });
  }
}