import Store from './Store';

/**
 * Interface for injecting all components required to instantiate a Hub.
 */
export default interface Context {
  /**
   * The Store implementation for accessing Hub data.
   */
  store: Store;
}