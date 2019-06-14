/*!
 * SuperGenPass library
 * https://github.com/chriszarate/supergenpass-lib
 * https://chriszarate.github.com/supergenpass/
 * License: GPLv2
 */

function validateCallback(callback) {
  if (typeof callback !== 'function') {
    throw new Error('Must provide callback function.');
  }
}

function validateLength(num) {
  if (num !== parseInt(num, 10) || num < 4 || num > 24) {
    throw new Error("Length must be an integer between 4 and 24: "+num+".");
  }
}

function validatePassword(str, length, charset) {
  // Cut password to requested length.
  const password = str.substring(0, length);

  // 1. Password must start with a lowercase letter [a-z].
  // 2. Password must contain at least one uppercase letter [A-Z].
  // 3. Password must contain at least one numeral [0-9].
  const containsLowercaseLetter = /[a-z]/;
  const containsUppercaseLetter = /[A-Z]/;
  const containsNumeral = /[0-9]/;
  const containsSpecials = /[+@\-_$£*?=.\/!:>%]/;

  // Return true if all tests are satisfied.
  return (charset[0]?containsLowercaseLetter.test(password):!containsLowercaseLetter.test(password)) &&
   (charset[1]?containsUppercaseLetter.test(password):!containsUppercaseLetter.test(password)) &&
   (charset[2]?containsNumeral.test(password):!containsNumeral.test(password)) &&
   (charset[3]?containsSpecials.test(password):!containsSpecials.test(password));
}

function validatePasswordInput(str) {
  if (typeof str !== 'string') {
    throw new Error("Password must be a string, received "+typeof str+".");
  }
}

function validatePasswordLength(str) {
  if (!str.length) {
    throw new Error('Combined password input must not be empty.');
  }
}

function validateCharset(charset){
  if ((typeof charset[0]!='boolean')||(typeof charset[1]!='boolean')||(typeof charset[2]!='boolean')||(typeof charset[3]!='boolean')){
    throw new Error('Charset must be an array of boolean');
  }else{
    if (charset[0]===false&&charset[1]===false&&charset[2]===false&&charset[3]===false){
      throw new Error('Charset must not be empty.');
    }
  }
}

  module.exports = {validateCallback :validateCallback,
                    validateLength : validateLength,
                    validatePassword : validatePassword,
                    validatePasswordInput : validatePasswordInput,
                    validatePasswordLength : validatePasswordLength,
                    validateCharset : validateCharset}
