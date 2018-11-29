
export const PERMISSION_GRANT_SCHEMA = 'schema.identity.foundation/0.1/PermissionGrant';

/**
 * Represents a Permission Grant object
 */
export default interface PermissionGrant {
  owner: string;
  grantee: string;
  allow: string;
  object_type: string;
  created_by?: string;
}
