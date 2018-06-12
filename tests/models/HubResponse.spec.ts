import HubResponse from '../../lib/models/HubResponse';
import HubError from '../../lib/models/HubError';
import { StoredObject } from '../../lib/interfaces/Store';

class TestObject implements StoredObject {
  owner: string;
  id: string;
  schema: string;
  meta?: object;
  payload: any;
  constructor() {
    this.owner = `did:test:${Math.random().toString()}.id`;
    this.id = Math.random().toString();
    this.schema = `schema.example.com/${Math.random().toString()}`;
    this.meta = { random: Math.random().toString() };
    this.payload = Math.random();
  }
}

describe('ApiReponse', () => {

  describe('withErrors', () => {
    it('should return normal errors', () => {
      const message = Math.random().toString();
      const response = HubResponse.withError(new Error(message));
      const body = response.getResponseBody();
      expect(body).toBeDefined();
      if (body) {
        expect(body.error).toBeDefined();
        if (body.error) {
          expect(body.error.message).toEqual(message, 'Error message did not match');
        } else {
          fail('error was not defined in the returned body');
        }
      } else {
        fail('response body not defined');
      }
    });

    it('should return HubErrors with custom error codes', () => {
      const message = Math.random().toString();
      const code = Math.round(Math.random());
      const response = HubResponse.withError(new HubError(message, code));
      const body = response.getResponseBody();
      expect(body).toBeDefined();
      if (body) {
        expect(body.error).toBeDefined();
        if (body.error) {
          expect(body.error.message).toEqual(message, 'Error message did not match');
          expect(response.getResponseCode()).toEqual(code, 'Error code did not match');
        } else {
          fail('error was not defined in the returned body');
        }
      } else {
        fail('response body not defined');
      }
    });
  });

  describe('with single objects', () => {
    it('should return an object', () => {
      const test = new TestObject();
      const response = HubResponse.withObject(test);
      expect(response.getResponseCode()).toEqual(200, 'response code was not OK');
      const body = response.getResponseBody();
      expect(body).toBeDefined();
      if (body) {
        expect(body.error).toBeUndefined();
        expect(body.payload).toBeDefined();
        const payload = body.payload;
        if (payload) {
          // payload has no type defined
          const obj: any = (payload as any[])[0];
          expect(obj).toBeDefined();
          if (obj) {
            expect(obj.meta).toBeDefined();
            if (obj.meta) {
              expect(obj.meta.id).toEqual(test.id);
            } else {
              fail('object meta was not defined');
            }
            expect(obj.data).toBeDefined();
            expect(obj.data).toEqual(test.payload);
          } else {
            fail('payload does not contain an object');
          }
        } else {
          fail('payload was not defined');
        }
      } else {
        fail('body was not defined');
      }
    });
  });

  describe('with Success', () => {
    it('should return success', () => {
      const response = HubResponse.withSuccess();
      expect(response.getResponseCode()).toEqual(200, 'response code was not OK');
      const body = response.getResponseBody();
      expect(body).toBeDefined();
      if (body) {
        expect(body.error).toBeUndefined();
        expect(body.payload).toBeDefined();
        const payload = (body.payload as any);
        if (payload) {
          expect(payload.success).toBeDefined();
          expect(payload.success).toEqual(true, 'success was not true');
        } else {
          fail('payload was not defined');
        }
      } else {
        fail('body was not defined');
      }
    });
  });

  describe('with multiple objects', () => {
    it('should return mutliple objects', () => {
      const test: TestObject[] = [];
      const numObjects = Math.round(Math.random() * 10);
      for (let i = 0; i < numObjects; i += 1) {
        test.push(new TestObject());
      }
      const response = HubResponse.withObjects(test);
      expect(response.getResponseCode()).toEqual(200, 'response code was not OK');
      const body = response.getResponseBody();
      expect(body).toBeDefined();
      if (body) {
        expect(body.error).toBeUndefined();
        expect(body.payload).toBeDefined();
        const payload = body.payload;
        if (payload) {
          const objects = payload as any[];
          objects.forEach((testObject, index) => {
            expect(testObject).toBeDefined();
            if (testObject) {
              expect(testObject.meta).toBeDefined();
              if (testObject.meta) {
                expect(testObject.meta.id).toEqual(test[index].id);
              } else {
                fail('object meta was not defined');
              }
              expect(testObject.data).toBeDefined();
              expect(testObject.data).toEqual(test[index].payload);
            } else {
              fail('payload does not contain an object');
            }
          });
        } else {
          fail('payload was not defined');
        }
      } else {
        fail('body was not defined');
      }
    });
  });
});
