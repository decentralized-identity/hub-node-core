import { Store } from '../../lib/interfaces/Store';
import Context from '../../lib/interfaces/Context';
import TestStore from './TestStore';
import { CryptoSuite, PrivateKey, PrivateKeyRsa } from '@decentralized-identity/did-auth-jose';
import { IDidResolver, unitTestExports } from '@decentralized-identity/did-common-typescript';

/**
 * Class containing all the components that would be
 * injected through Hub Core initialization function.
 */
export default class TestContext implements Context {
  keys: { [name: string]: PrivateKey };
  store: Store;
  static instance: TestContext;
  cryptoSuites: CryptoSuite[];
  resolver: IDidResolver;
  requireAccessTokens?: boolean;

  constructor() {
    this.keys = {};
    this.store = new TestStore();
    this.cryptoSuites = [];
    this.resolver = new unitTestExports.TestResolver();
  }

  async createPrivateKey(did: string): Promise<PrivateKey> {
    const hubkey = await PrivateKeyRsa.generatePrivateKey(did);
    return hubkey;
  }
}
