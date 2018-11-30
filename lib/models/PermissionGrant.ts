
export const PERMISSION_GRANT_CONTEXT = 'schema.identity.foundation/0.1';
export const PERMISSION_GRANT_TYPE = 'PermissionGrant';

/**
 * Represents a Permission Grant object
 */
export default interface PermissionGrant {
  owner: string;
  grantee: string;
  allow: string;
  context: string;
  type: string;
  created_by?: string;
}

export const OWNER_PERMISSION: PermissionGrant = {
  owner: '*',
  grantee: '*',
  allow: 'CRUD',
  context: '*',
  type: '*',
};
