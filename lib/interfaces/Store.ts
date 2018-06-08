/**
 * Interface for an object stored in the Hub.
 */
export interface StoredObject {
  owner: string;
  id: string;
  schema: string;
  meta?: object;
  payload: any;
}

export interface CreateDocumentOptions {
  owner: string;
  schema: string;
  id?: string;
  meta?: object;
  payload: any;
}

export interface QueryDocumentsOptions {
  owner: string;
  schema: string;
}

export interface UpdateDocumentOptions {
  owner: string;
  schema: string;
  id: string;
  meta?: object;
  payload: any;
}

export interface DeleteDocumentOptions {
  owner: string;
  schema: string;
  id: string;
}

/**
 * Interface for storing Hub data.
 * NOTE: This is subject to change as replication design solidifies.
 */
export default interface Store {
  createDocument(options: CreateDocumentOptions): Promise<StoredObject>;

  queryDocuments(options: QueryDocumentsOptions): Promise<StoredObject[]>;

  updateDocument(options: UpdateDocumentOptions): Promise<StoredObject>;

  deleteDocument(options: DeleteDocumentOptions): Promise<void>;
};
