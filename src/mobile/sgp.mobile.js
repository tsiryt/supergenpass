'use strict';



/*jshint browser: true, latedef: false*/

var getHostname = require('./lib/hostname');
var generate =  require('./lib/generate');
var $ = require('jquery');
var ripemd160 = require('crypto-js/ripemd160');
var sha3 = require('crypto-js/sha3');
var identicon = require('./lib/identicon5');
var shortcut = require('./lib/shortcut');
var storage = require('./lib/localstorage-polyfill');

// Set default values.
var messageOrigin = false;
var messageSource = false;
var language = location.search.substring(1);
var latestBookmarklet = '../bookmarklet/bookmarklet.min.js';
var latestVersion = 20150216;

// Hostnames that should not be populated into the domain field on referral.
var noReferral = [
  'chriszarate.github.io',
  'www.google.com',
  'www.bing.com',
  'duckduckgo.com',
  'r.search.yahoo.com'
];

var localizations = {
  'en':    ['Master password', 'Domain / URL', 'Generate'],
  'es':    ['Contraseña maestra', 'Dominio / URL', 'Enviar'],
  'fr':    ['Mot de passe principal', 'Domaine / URL', 'Soumettre'],
  'de':    ['Master Passwort', 'Domain / URL', 'Abschicken'],
  'pt-br': ['Senha-mestra', 'Domínio / URL', 'Gerar'],
  'zh-hk': ['主密碼', '域名 / URL', '提交'],
  'hu':    ['Mesterjelszó', 'Tartomány / Internetcím', 'OK'],
  'ru':    ['Мастер-пароль', 'Домена / URL', 'Подтвердить'],
  'nl':    ['Hoofd wachtwoord', 'Domein / URL', 'Genereer'],
  'fy':    ['Haad wachtwurd', 'Domein / URL', 'Ferwurkje']
};

// Enumerate jQuery selectors for caching.
var $el = {};
var selectors =
  [
    'PasswdField',
    'Passwd',
    'PasswdLabel',
    'Secret',
    'DomainField',
    'Domain',
    'DomainLabel',
    'RemoveSubdomains',
    'Len',
    'Result',
    'Generate',
    'MaskText',
    'CopyButton',
    'Output',
    'Canvas',
    'Options',
    'SaveDefaults',
    'Update',
    'Bookmarklet',
    'Letters',
    'Caps',
    'Numbers',
    'Spec'
  ];

// Retrieve defaults from local storage.

var getDefaults = function(refresh){
  if (storage.local.getItem(getDomainTrue(false))){
    var localStorage = refresh? storage.local.getItem(getDomainTrue(false)).split(',') :storage.local.getItem(getDomain(false)).split(',');
    return defaults ={
        length: localStorage[0],
        secret: localStorage[1],
        method: localStorage[2],
        charset: [localStorage[3],localStorage[4],localStorage[5],localStorage[6]],
        removeSubdomains: !localStorage[7],
        advanced: storage.local.getItem('Advanced') || false
    };
  }else if(storage.local.getItem(getDomainTrue(true))){
    var localStorage = refresh? storage.local.getItem(getDomainTrue(true)).split(',') :storage.local.getItem(getDomain(true)).split(',');
    return defaults ={
        length: localStorage[0],
        secret: localStorage[1],
        method: localStorage[2],
        charset: [localStorage[3],localStorage[4],localStorage[5],localStorage[6]],
        removeSubdomains: !localStorage[7],
        advanced: storage.local.getItem('Advanced') || false
    };
  }else if(storage.local.getItem('default')){
    var localStorage = storage.local.getItem('default').split(',');
    if(!refresh&&!localStorage){getDomain(true);}
    return defaults ={
        length: localStorage[0],
        secret: localStorage[1],
        method: localStorage[2],
        charset: [localStorage[3],localStorage[4],localStorage[5],localStorage[6]],
        removeSubdomains: !localStorage[7],
        advanced: storage.local.getItem('Advanced') || false
    };
  }else{
    return defaults ={
      length: 10,
      secret: '',
      method: 'sha3',
      charset: [true,true,true,true],
      removeSubdomains: false,
      advanced: storage.local.getItem('Advanced') || false
    };
  }
};

// Save current options to local storage as defaults.
var saveCurrentOptionsAsDefaults = function (e) {
  var input = getCurrentFormInput();
  if (input.domain){
    storage.local.setItem(input.domain, [input.options.length,
                                  input.options.secret,
                                  input.options.method,
                                  input.options.charset[0]||'',
                                  input.options.charset[1]||'',
                                  input.options.charset[2]||'',
                                  input.options.charset[3]||'',
                                  !input.options.removeSubdomains || '']);
  }else{
    storage.local.setItem('default', [input.options.length,
                                  input.options.secret,
                                  input.options.method,
                                  input.options.charset[0]||'',
                                  input.options.charset[1]||'',
                                  input.options.charset[2]||'',
                                  input.options.charset[3]||'',
                                  !input.options.removeSubdomains || '']);
  }
  showButtonSuccess(e);
};

var showUpdateNotification = function (data) {
  $el.Bookmarklet.attr('href', data);
  $el.Update.show();
  sendDocumentHeight();
};

// Populate domain with referrer, if available and not from the blacklist.
var populateReferrer = function (referrer) {
  if (referrer) {
    referrer = getHostname(referrer, {removeSubdomains: false});
    if (noReferral.indexOf(referrer) === -1) {
      $el.Domain.val(getHostname(referrer, {removeSubdomains: false}));
    }
  }
};

// Listen for postMessage from bookmarklet.
var listenForBookmarklet = function (event) {

  var post = event.originalEvent;

  if (post.origin !== window.location.origin) {

    // Save message source.
    messageSource = post.source;
    messageOrigin = post.origin;

    // Parse message.
    $.each(JSON.parse(post.data), function (key, value) {
      switch (key) {
      case 'version':
        if (value < latestVersion) {
          // Fetch latest bookmarklet.
          $.ajax({
            url: latestBookmarklet,
            success: showUpdateNotification,
            dataType: 'html'
          });
        }
        break;
      }
    });

    // Populate domain field and call back with the browser height.
    var defaults = getDefaults(false);
    $el.Domain.val(getHostname(messageOrigin, {removeSubdomains: defaults.removeSubdomains})).trigger('change');
    sendDocumentHeight();

  }

};

var sendDocumentHeight = function () {
  postMessageToBookmarklet({
    height: $el.Body.height()
  });
};

var sendGeneratedPassword = function (generatedPassword) {
  postMessageToBookmarklet({
    result: generatedPassword
  });
};

// Send message using HTML5 postMessage API. Only post a message if we are in
// communication with the bookmarklet.
var postMessageToBookmarklet = function (message) {
  if (messageSource && messageOrigin) {
    messageSource.postMessage(JSON.stringify(message), messageOrigin);
  }
};

var getCurrentFormInput = function () {
  var removeSubdomains = $el.RemoveSubdomains.is(':checked');
  return {
    password: $el.Passwd.val(),
    domain: getDomain(removeSubdomains),
    options: {
      secret: $el.Secret.val(),
      charset: [$el.Letters.is(':checked'),
                $el.Caps.is(':checked'),
                $el.Numbers.is(':checked'),
                $el.Spec.is(':checked')],
      length: getPasswordLength(),
      method: getHashMethod(),
      removeSubdomains: removeSubdomains
    }
  };
};

// Get valid domain value and update form.
var getDomain = function (removeSubdomains) {
  var domain = $el.Domain.val().replace(/ /g, '');
  if (domain) {
    domain = getHostname(domain, {removeSubdomains: removeSubdomains});
    $el.Domain.val(domain);
  }
  return domain;
};

var getDomainTrue = function (removeSubdomains) {
  var domain = $el.Domain.val().replace(/ /g, '');
  if (domain) {
    domain = getHostname(domain, {removeSubdomains: removeSubdomains});
  }
  return domain;
};

// Get valid password length and update form.
var getPasswordLength = function () {
  var passwordLength = validatePasswordLength($el.Len.val());
  $el.Len.val(passwordLength);
  return passwordLength;
};

var validatePasswordLength = function (passwordLength) {
  passwordLength = parseInt(passwordLength, 10) || 10;
  return Math.max(4, Math.min(passwordLength, 24));
};

var getHashMethod = function () {
  return $('input:radio[name=Method]:checked').val() || 'sha3';
};

// Generate hexadecimal hash for identicons.
var generateIdenticonHash = function (seed, hashMethod) {
  var hashFunction = (hashMethod === 'ripemd160') ? ripemd160 : sha3;
  for (var i = 0; i <= 4; i = i + 1) {
    seed = hashFunction(seed).toString();
  }
  return seed;
};

var generateIdenticon = function () {

  var input = getCurrentFormInput();
  var options = input.options;

  if (input.password || options.secret) {
    var identiconHash = generateIdenticonHash(input.password + options.secret, options.method);
    identicon($el.Canvas[0], identiconHash, 16);
    $el.Canvas.show();
  } else {
    $el.Canvas.hide();
  }

};

var generatePassword = function () {

  var input = getCurrentFormInput();
  var options = input.options;

  if (!input.password) {
    $el.PasswdField.addClass('Missing');
  }

  if (!input.domain) {
    $el.DomainField.addClass('Missing');
  }

  if (input.password && input.domain) {
    generate(input.password, input.domain, options, populateGeneratedPassword);
  }

};

var populateGeneratedPassword = function (generatedPassword) {
  sendGeneratedPassword(generatedPassword);
  $el.Inputs.trigger('blur');
  $el.Output.text(generatedPassword);
  $el.Result.addClass('Offer').removeClass('Reveal');
  shortcut.add('Ctrl+H', toggleGeneratedPassword);
};

var toggleGeneratedPassword = function () {
  $el.Result.toggleClass('Reveal');
};

var clearGeneratedPassword = function (event) {

  var key = event.which;

  // Test for input key codes.
  var group1 = ([8, 32].indexOf(key) !== -1);
  var group2 = (key > 45 && key < 91);
  var group3 = (key > 95 && key < 112);
  var group4 = (key > 185 && key < 223);
  var enterKey = (key === 13);

  // When user enters form input, reset form status.
  if (event.type === 'change' || group1 || group2 || group3 || group4) {
    $el.Output.text('');
    $el.Result.removeClass('Offer');
    $el.PasswdField.removeClass('Missing');
    $el.DomainField.removeClass('Missing');
    shortcut.remove('Ctrl+H');
  }

  // Submit form on enter key.
  if (enterKey) {
    $el.Generate.trigger('click');
    event.preventDefault();
  }

};

var adjustPasswordLength = function (event) {
  var increment = ($(this).attr('id') === 'Up') ? 1 : -1;
  var passwordLength = validatePasswordLength($el.Len.val());
  var newPasswordLength = validatePasswordLength(passwordLength + increment);
  $el.Len.val(newPasswordLength).trigger('change');
  event.preventDefault();
};

var toggleAdvancedOptions = function () {
  var advanced = !$el.Body.hasClass('Advanced');
  $el.Body.toggleClass('Advanced', advanced);
  storage.local.setItem('Advanced', advanced || '');
  sendDocumentHeight();
};

var toggleSubdomainIndicator = function () {
  var input = getCurrentFormInput();
  $el.Domain.trigger('change');
  $el.DomainField.toggleClass('Advanced', !input.options.removeSubdomains);
};

// Update button to show a success indicator. Remove indicator after 5 seconds.
var showButtonSuccess = function (e) {
  $(e.target).addClass('Success');
  setTimeout(function () {
    $(e.target).removeClass('Success');
  }, 5000);
};

// Populate selector cache.
$el.Inputs = $('input');
$el.Body = $(document.body);
$.each(selectors, function (i, val) {
  $el[val] = $('#' + val);
});

// Load defaults into form.
var loadIntoForm = function () {
  var defaults = getDefaults(true);
  $('input:radio[value=' + defaults.method + ']').prop('checked', true);
  $el.Len.val(validatePasswordLength(defaults.length));
  $el.Secret.val(defaults.secret).trigger('change');
  $el.Letters.prop('checked', defaults.charset[0]);
  $el.Caps.prop('checked', defaults.charset[1]);
  $el.Numbers.prop('checked', defaults.charset[2]);
  $el.Spec.prop('checked', defaults.charset[3]);
};
var defaults = getDefaults(false);
$el.RemoveSubdomains.prop('checked', defaults.removeSubdomains).trigger('change');  
$el.Body.toggleClass('Advanced', defaults.advanced);
loadIntoForm();

// Perform localization, if requested.
if (language && localizations.hasOwnProperty(language)) {
  $el.Passwd.attr('placeholder', localizations[language][0]);
  $el.Domain.attr('placeholder', localizations[language][1]);
  $el.PasswdLabel.text(localizations[language][0]);
  $el.DomainLabel.text(localizations[language][1]);
  $el.Generate.text(localizations[language][2]);
}

// Provide fake input placeholders if browser does not support them.
if (!('placeholder' in document.createElement('input'))) {
  $('#Passwd, #Secret, #Domain').on('keyup change', function () {
    $('label[for=' + $(this).attr('id') + ']').toggle($(this).val() === '');
  }).trigger('change');
}

// Copy to clipboard if possible.
// https://developers.google.com/web/updates/2015/04/cut-and-copy-commands?hl=en
$el.CopyButton.on('click', function (e) {
  var range = document.createRange();
  var selection = window.getSelection();
  var success = false;

  range.selectNodeContents($el.Output.get(0));
  selection.removeAllRanges();
  selection.addRange(range);

  try {
    success = document.execCommand('copy');
  } catch (err) {}

  selection.removeAllRanges();

  if (success) {
    showButtonSuccess(e);
    $el.Result.removeClass('Reveal');
    return;
  }

  $el.CopyButton.hide();
});

// Bind to interaction events.
$el.Generate.on('click', generatePassword);
$el.MaskText.on('click', toggleGeneratedPassword);
$el.Options.on('click', toggleAdvancedOptions);
$el.SaveDefaults.on('click', saveCurrentOptionsAsDefaults);
$('#Up, #Down').on('click', adjustPasswordLength);

// Bind to form events.
$el.RemoveSubdomains.on('change', toggleSubdomainIndicator);
$el.Inputs.on('keydown change', clearGeneratedPassword);
$el.Domain.on('change', loadIntoForm);
$('#Passwd, #Secret, #MethodField').on('keyup change', generateIdenticon);

// Bind to hotkeys.
shortcut.add('Ctrl+O', toggleAdvancedOptions);
shortcut.add('Ctrl+G', generatePassword);

// Populate domain with referrer, if available.
populateReferrer(document.referrer);

// Set focus on password field.
$el.Passwd.trigger('focus').trigger('change');

// Attach postMessage listener for bookmarklet.
$(window).on('message', listenForBookmarklet);
