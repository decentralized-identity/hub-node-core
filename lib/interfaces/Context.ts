import Store from './Store';

/**
 * Interface for injecting all components required to instantiate a Hub.
 */
export default interface Context {

  /**
   * The list of Hub keys. Each key must be in JWK format.
   */
  keys: { [name: string]: object };

  /**
   * The Store implementation for accessing Hub data.
   */
  store: Store;
}
