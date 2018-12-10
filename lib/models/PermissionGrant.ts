
export const PERMISSION_GRANT_CONTEXT = 'schema.identity.foundation/0.1';
export const PERMISSION_GRANT_TYPE = 'PermissionGrant';

/**
 * Represents a Permission Grant object
 */
export default interface PermissionGrant {
  /** Owner DID granting permission */
  owner: string;
  /** DID the permission is granted to */
  grantee: string;
  /** Permissioned allowed in the form of a "CRUD" string, or "----" for no permission */
  allow: string;
  /** Context of the object being permitted */
  context: string;
  /** Type of the object being permitted */
  type: string;
  /** Optional DID of the object creater to scope this permission down to */
  created_by?: string;
}

export const OWNER_PERMISSION: PermissionGrant = {
  owner: '*',
  grantee: '*',
  allow: 'CRUD',
  context: '*',
  type: '*',
};
