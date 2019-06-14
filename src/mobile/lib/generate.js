/*!
 * SuperGenPass library
 * https://github.com/chriszarate/supergenpass-lib
 * https://chriszarate.github.com/supergenpass/
 * License: GPLv2
 */

var hash = require('./hash');
var hostname = require('./hostname');
var validate = require('./validate');

// Hash the input for the requested number of rounds, then continue hashing
// until the password policy is satisfied. Finally, pass result to callback.
function hashRound(input, length, hashFunction, rounds, callback, charset) {
  while (rounds > 0 || !validate.validatePassword(input, length, charset)) {
    input = hashFunction(input, charset);
    rounds -= 1;
  }
  callback(input.substring(0,length));
}

function generate(
    masterPassword,
    url,
    userOptions,
    callback// eslint-disable-line no-console
  ) {
  const defaults = {
    hashRounds: 10,
    length: 10,
    method: 'sha3',
    removeSubdomains: true,
    secret: '',
    charset : [true,true,true,true]
  };
  const options = Object.assign({}, defaults, userOptions);

  validate.validateCallback(callback);
  validate.validateCharset(options.charset);
  validate.validatePasswordInput(masterPassword);
  validate.validatePasswordInput(options.secret);
  validate.validatePasswordLength(masterPassword + options.secret);
  validate.validateLength(options.length);

  const domain = hostname(url, options);
  const input = ""+masterPassword+options.secret+":"+domain;

  hashRound(input, options.length, hash(options.method), options.hashRounds, callback, options.charset);
}

module.exports = generate;
