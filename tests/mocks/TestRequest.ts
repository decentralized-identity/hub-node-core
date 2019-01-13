import BaseRequest from "../../lib/models/BaseRequest";
import ObjectQueryRequest from "../../lib/models/ObjectQueryRequest";
import WriteRequest from "../../lib/models/WriteRequest";
import { Operation } from "../../lib/models/Commit";
import TestCommit from '../mocks/TestCommit';
import TestUtilities from "../TestUtilities";

export interface requestOptions {
  iss: string
  aud: string
  sub: string
  kid: string
  interface: string
  context: string
  type: string
  skipToken: string
  operation: string
  payload: any
  commit_strategy: string
  object_id: string | string[];
  override_commit_sub: string
  override_no_interface: boolean
  override_no_context: boolean
  override_no_type: boolean
  override_no_object_id: boolean
}

export default class TestRequest extends BaseRequest {


  static createObjectQueryRequest(options?: Partial<requestOptions>): ObjectQueryRequest {
    const query: any = {
      interface: options && options.interface? options.interface : 'Base',
      context: options && options.context? options.context : 'example.com',
      type: options && options.type? options.type : 'type',
    }
    TestRequest.overridesOnObject(query, options);
    const request: any = {
      '@context': BaseRequest.context,
      '@type': 'ObjectQueryRequest',
      iss: options && options.iss? options.iss : 'did:example:alice.id',
      aud: options && options.aud? options.aud : 'did:example:hub.id',
      sub: options && options.sub? options.sub : 'did:example:alice.id',
      query,
    };
    if (options && options.skipToken) {
      request.query.skip_token = options.skipToken;
    }
    return new ObjectQueryRequest(request);
  }

  static createWriteRequest(options?: Partial<requestOptions>): WriteRequest {
    const headers: any = {
      interface: options && options.interface? options.interface : 'Base',
      context: options && options.context? options.context : 'example.com',
      type: options && options.type? options.type : 'type',
      operation: options && options.operation? options.operation : Operation.Create,
      'commit_strategy': options && options.commit_strategy ? options.commit_strategy : 'basic',
      sub: options && options.override_commit_sub ? options.override_commit_sub : options && options.sub? options.sub : 'did:example:alice.id',
      kid: options && options.kid? options.kid : `${options && options.iss? options.iss : 'did:example:alice.id'}#key1`,
    };
    if (options && (options.operation == Operation.Update || options.operation === Operation.Delete) && !options.object_id) {
      headers.object_id = TestUtilities.randomString();
    }
    TestRequest.overridesOnObject(headers, options);
    if (options && options.object_id) {
      headers.object_id = options.object_id;
    }

    const commit = TestCommit.create(headers,
    options && options.payload ? options.payload: {testData: "password"});
    
    const request: any = {
      '@context': BaseRequest.context,
      '@type': 'WriteRequest',
      iss: options && options.iss? options.iss : 'did:example:alice.id',
      aud: options && options.aud? options.aud : 'did:example:hub.id',
      sub: options && options.sub? options.sub : 'did:example:alice.id',
      commit: {
        protected: commit.getProtectedString(),
        payload: commit.getPayloadString(),
        signature: '',
      },
    };

    if (options && options.skipToken) {
      request.query.skip_token = options.skipToken;
    }
    return new WriteRequest(request);
  }

  private static overridesOnObject(object: any, options?: Partial<requestOptions>) {
    if (options) {
      if (options.override_no_interface) {
        delete object.interface;
      }
      if (options.override_no_context) {
        delete object.context;
      }
      if (options.override_no_type) {
        delete object.type;
      }
      if (options.override_no_object_id) {
        delete object.object_id;
      }
    }
  }
}