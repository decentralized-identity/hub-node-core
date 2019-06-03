import { Store } from './Store';
import { CryptoSuite, PrivateKey } from '@decentralized-identity/did-auth-jose';
import { IDidResolver } from '@decentralized-identity/did-common-typescript';

/**
 * Interface for injecting all components required to instantiate a Hub.
 */
export default interface Context {

  /**
   * The list of Hub keys. Each key must be in JWK format.
   * TODO: Introduce a layer of abstraction to support secure methods of loading private keys.
   */
  keys: { [name: string]: PrivateKey };

  /**
   * The list of all CryptoSuite objects.
   */
  cryptoSuites: CryptoSuite[];

  /**
   * The Store implementation for accessing Hub data.
   */
  store: Store;

  /**
   * The object to use for resolving DIDs
   */
  resolver: IDidResolver;

  /**
   * Optional flag to require access tokens for hub operations. Defaults to requiring tokens (true).
   */
  requireAccessTokens?: boolean;
}
