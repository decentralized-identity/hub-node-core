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
      if (!body) {
        fail('response body not defined');
        return;
      }
      expect(body.error).toBeDefined();
      if (!body.error) {
        fail('error was not defined in the returned body');
        return;
      }
      expect(body.error.message).toEqual(message, 'Error message did not match');
    });

    it('should return HubErrors with custom error codes', () => {
      const message = Math.random().toString();
      const code = Math.round(Math.random());
      const response = HubResponse.withError(new HubError(message, code));
      const body = response.getResponseBody();
      if (!body) {
        fail('response body not defined');
        return;
      }
      expect(body.error).toBeDefined();
      if (!body.error) {
        fail('error was not defined in the returned body');
        return;
      }
      expect(body.error.message).toEqual(message, 'Error message did not match');
      expect(response.getResponseCode()).toEqual(code, 'Error code did not match');
    });
  });

  describe('with single objects', () => {
    it('should return an object', () => {
      const test = new TestObject();
      const response = HubResponse.withObject(test);
      expect(response.getResponseCode()).toEqual(200, 'response code was not OK');
      const body = response.getResponseBody();
      if (!body) {
        fail('body was not defined');
        return;
      }
      expect(body.error).toBeUndefined();
      const payload = body.payload;
      if (!payload) {
        fail('payload was not defined');
        return;
      }
      // payload has no type defined
      const obj: any = (payload as any[])[0];
      if (!obj) {
        fail('payload does not contain an object');
        return;
      }
      if (!obj.meta) {
        fail('object meta was not defined');
        return;
      }
      expect(obj.meta.id).toEqual(test.id);
      expect(obj.data).toBeDefined();
      expect(obj.data).toEqual(test.payload);
    });
  });

  describe('with Success', () => {
    it('should return success', () => {
      const response = HubResponse.withSuccess();
      expect(response.getResponseCode()).toEqual(200, 'response code was not OK');
      const body = response.getResponseBody();
      if (!body)  {
        fail('body was not defined');
        return;
      }
      expect(body.error).toBeUndefined();
      const payload = (body.payload as any);
      if (!payload) {
        fail('payload was not defined');
        return;
      }
      expect(payload.success).toBeDefined();
      expect(payload.success).toEqual(true, 'success was not true');
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
      if (!body) {
        fail('body was not defined');
        return;
      }
      expect(body.error).toBeUndefined();
      const payload = body.payload;
      if (!payload) {
        fail('payload was not defined');
        return;
      }
      const objects = payload as any[];
      objects.forEach((testObject, index) => {
        if (!testObject) {
          fail('payload does not contain an object');
          return;
        }
        if (!testObject.meta) {
          fail('object meta was not defined');
          return;
        }
        expect(testObject.meta.id).toEqual(test[index].id);
        expect(testObject.data).toBeDefined();
        expect(testObject.data).toEqual(test[index].payload);
      });
    });
  });
});
