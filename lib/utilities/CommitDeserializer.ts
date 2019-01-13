import Commit from '../models/Commit';
import SignedCommit from '../models/SignedCommit';

/**
 * Inflates a `Commit` object from a serialized JWT.
 *
 * Currently accepts only JWS objects in the Flattened JWS JSON Serialization (RFC 7517 §7.2.2).
 *
 * @param commit A JWS in Flattened JSON Serialization.
 */
async function deserialize(commit: any): Promise<Commit> {

  if (typeof commit !== 'object') {
    throw new Error(`Commit must be of type object; type given was: ${typeof commit}`);
  }

  const requiredFields = ['protected', 'payload', 'signature'];
  const allowedFields = ['header'].concat(requiredFields);
  const actualFields = Object.keys(commit);

  requiredFields.forEach((field) => {
    if (!actualFields.includes(field)) {
      throw new Error(`Serialized commit is missing required field: ${field}`);
    }
  });

  actualFields.forEach((field) => {
    if (!allowedFields.includes(field)) {
      throw new Error(`Serialized commit has extraneous field: ${field}`);
    }
  });

  return new SignedCommit(commit);

}

export default {
  deserialize,
};
