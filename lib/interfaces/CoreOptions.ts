import Store from './Store';

/**
 * Interface for specifying options required to instantiate the Hub Core.
 */
export default interface CoreOptions {
  /**
   * The Store implementation for accessing Hub data.
   */
  store: Store;
}
