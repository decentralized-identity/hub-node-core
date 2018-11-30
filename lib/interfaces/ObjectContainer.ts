/**
 * Summarized object metadata
 */
export default interface ObjectContainer {

  /** Interface the object exists within */
  interface: string;

  /** Context for the schema of the object */
  context: string;

  /** Schema type of the object */
  type: string;

  /** ID of the object */
  id: string;

  /** Issuer of the initial create commit */
  created_by: string;

  /** Time at which the object was created at */
  created_at: string;

  /** Subject of the object (object owner) */
  sub: string;

  /** Commit strategy used */
  commit_strategy: string;

  /** Optional latest resolved state of the meta parameter */
  meta?: any;

}
