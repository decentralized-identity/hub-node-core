import Store from '../../lib/interfaces/Store';
import Context from '../../lib/interfaces/Context';
import TestStore from './TestStore';
/**
 * Class containing all the components that would be
 * injected through Hub Core initialization function.
 */
export default class TestContext implements Context {
  keys: { [name: string]: object };
  store: Store;

  static instance: TestContext;

  constructor() {
    this.keys = {};
    this.store = new TestStore();

  }
}
