import Strings from '../lib/utilities/Strings';
import Validation from '../lib/utilities/Validation';

describe('Utilities', () => {
  describe('Strings', () => {
      it ('should make the first letter of test uppercase', () => {
        const test = 'test';
        expect(Strings.upperFirst(test)).toBe('Test');
      });
  });
  
  describe('Validation', () => {
    it('should unwrap an optional value', () => {
      const test = 'test';
      expect(Validation.requiredValue<String>(test)).toBe(test);
    });
    it('should throw a HubError', () => {
      expect(function () {
        Validation.requiredValue<String>(null);
      }).toThrowError(/The required property must be specified/i);
    });

  });

});