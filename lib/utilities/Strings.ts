/**
 * Helper class for string manipulation.
 */
export default class Strings {

  /**
   * Returns a string with the first character capitalized and the rest lowercase.
   *
   * Not currently locale-aware; should not be used with localized strings.
   */
  static upperFirst(str: string | undefined): string | undefined {
    if (str && str.length > 1) {
      return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
    }
    return str;
  }

}
