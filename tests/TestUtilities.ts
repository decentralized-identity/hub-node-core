
export default class TestUtilities {
  static randomString(): string {
    return Math.round(Math.random() * Number.MAX_SAFE_INTEGER).toString(32);
  }
}