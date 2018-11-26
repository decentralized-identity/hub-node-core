import BaseResponse from "../../lib/models/BaseResponse";

describe('BaseResponse', () => {
  describe('constructor', () => {
    it('should store the developerMessage', () => {
      const message = Math.round(Math.random() * Number.MAX_SAFE_INTEGER).toString(16);
      const response = new BaseResponse(message);
      expect(response.developerMessage).toEqual(message);
    });
  });

  describe('toString', () => {
    it('should form a json string to spec', () => {
      const message = Math.round(Math.random() * Number.MAX_SAFE_INTEGER).toString(16);
      const response = new BaseResponse(message).toString();
      const json = JSON.parse(response);
      expect(json['@context']).toBeDefined();
      expect(json['@type']).toBeDefined();
      expect(json['@type']).toEqual('BaseResponse');
      expect(json['developer_message']).toBeDefined();
      expect(json['developer_message']).toEqual(message);
    });
  });
})