/**
 * This file defines the external exports.
 */
import { HubErrorCode, IObjectMetadata } from '@decentralized-identity/hub-common-js';
import Hub from './Hub';

// Interfaces
import * as Store from './interfaces/Store';

// Models
import SignedCommit from './models/SignedCommit';
import Commit from './models/Commit';
import HubError from './models/HubError';
import HttpResolver from './plugins/HttpResolver';

// Utilities
import CommitDeserializer from './utilities/CommitDeserializer';

export default Hub;
export {
  Commit,
  CommitDeserializer,
  HubErrorCode,
  HubError,
  IObjectMetadata,
  SignedCommit,
  Store,
  HttpResolver,
};
