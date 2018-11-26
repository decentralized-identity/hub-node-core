import Strings from '../lib/utilities/Strings';

describe('Utilities', () => {
  describe('Strings', () => {
      it ('should make the first letter of test uppercase', () => {
        const test = 'test';
        expect(Strings.upperFirst(test)).toBe('Test');
      });
  });
});