// Offline rules matrix: proves, attribute by attribute, that optional CRVS person data is
// accepted when absent, accepted when correct, and rejected when present but wrong.
// The same validator is applied to every record returned by the API scenarios.

import { Given, When, Then } from '@cucumber/cucumber';
import chai from 'chai';
import { personFixture } from '../helpers/defaults.js';
import { validatePerson, validateMessage, formatErrors } from '../helpers/validator.js';
import { setPath, deletePath, encryptedMessage, callbackHeader } from '../helpers/payloads.js';
import { REMOVED } from './common_steps.js';

const { expect } = chai;

Given('the {string} CRVS person record', function (name) {
  this.record = personFixture(name);
});

Given('an empty CRVS person record', function () {
  this.record = {};
});

When('its {string} attribute is removed', function (path) {
  deletePath(this.record, path);
});

When('its {string} attribute is set to {string}', function (path, json) {
  if (json === REMOVED) deletePath(this.record, path);
  else setPath(this.record, path, JSON.parse(json));
});

Then('the person record should be valid', function () {
  const errors = validatePerson(this.record);
  expect(errors, `Expected a valid record but got:\n${formatErrors(errors)}`).to.be.empty;
});

// Regex rather than {string}: expected messages may themselves contain quotes.
Then(/^the person record should be rejected because of "(.*)"$/, function (expected) {
  const errors = validatePerson(this.record);
  expect(errors, 'Expected the record to be rejected').to.not.be.empty;
  expect(errors.some((e) => e.includes(expected)),
    `Expected an error mentioning "${expected}" but got:\n${formatErrors(errors)}`).to.be.true;
});

// Envelope-level: encrypted payloads are validated as EncryptedMessage.
Given('an encrypted {string} message', function (action) {
  this.request = { header: { ...callbackHeader(action), is_msg_encrypted: true }, message: encryptedMessage() };
  this.messageKind = action;
});

When('its encrypted field {string} is removed', function (path) {
  deletePath(this.request.message, path);
});

Then('the encrypted message should be valid', function () {
  const errors = validateMessage(this.messageKind, this.request);
  expect(errors, formatErrors(errors)).to.be.empty;
});

Then('the encrypted message should be rejected because of {string}', function (expected) {
  const errors = validateMessage(this.messageKind, this.request);
  expect(errors.some((e) => e.includes(expected)), `Expected an error mentioning "${expected}" but got:\n${formatErrors(errors)}`).to.be.true;
});
