import { CryptoSuite } from '@decentralized-identity/did-auth-jose';

export default class TestCryptoSuite implements CryptoSuite {
  getEncrypters() {
    return {
      TEST: {
        encrypt:function(data: Buffer, {}) {
          return data;
        },
        decrypt: function(data: Buffer, {}) {
          return data;
        }
      },
    }
  }
    
  getSigners() {
    return {
      TEST: {
        sign: function({}, {}, {}) {
          return Promise.reject(null);
        },
        verify: function({}, {}, {}) {
          return false;
        },
      },
    };
  }
  
  getKeys() {
    return  {
      TestKey: new TestPublicKeyFactory(),
    }
  }
}