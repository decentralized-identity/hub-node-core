import HubError from '../models/HubError';

/**
 * Helper class for parameter and input validation.
 */
export default class Validation {

  /**
   * Unwraps an optional value (e.g. `string?` to `string`), throwing an error if the value is `null` or `undefined`.
   */
  static requiredValue<T>(value: T | undefined | null, fieldName: string = 'required'): T {
    if (value === undefined || value === null) {
      throw new HubError('The ' + fieldName + ' property must be specified.');
    }
    return value;
  }

}
