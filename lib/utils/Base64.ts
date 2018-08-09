/**
 * Class for performing various base64 string operations.
 */
export default class Base64 {
  /**
   * Decodes the given base64 encoded string as JSON string,
   * then converts it into an object.
   */
  public static toObject(base64String: string): any {
    const jsonString = new Buffer(base64String, 'base64').toString();
    return JSON.parse(jsonString);
  }
}
