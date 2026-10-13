import { Given, Then } from '@cucumber/cucumber';
import chai from 'chai';
import {
  subscribeItem, subscribeMessage, unsubscribeMessage, txnStatusMessage,
  searchResponseMessage, subscribeResponseMessage, unsubscribeResponseMessage,
  txnStatusResponseMessage, notifyMessage,
} from '../helpers/payloads.js';
import { personFixture } from '../helpers/defaults.js';
import { useRequest } from './common_steps.js';

const { expect } = chai;

// ---------------------------------------------------------------------------
// CRVS-side requests
// ---------------------------------------------------------------------------
Given('a subscribe request for {string} events filtered by {string}', function (eventType, filterType) {
  useRequest(this, subscribeMessage([subscribeItem(eventType, filterType)]));
});

Given('a subscribe request for the events {string}', function (list) {
  useRequest(this, subscribeMessage(list.split(',').map((e) => subscribeItem(e.trim()))));
});

Given('an unsubscribe request for the subscription codes {string}', function (list) {
  useRequest(this, unsubscribeMessage(list.split(',').map((c) => c.trim())));
});

Given('a transaction status request for {string} transactions by {string}', function (txnType, attributeType) {
  useRequest(this, txnStatusMessage(txnType, attributeType));
});

Then('the transaction status should be reported for a {string} transaction', function (txnType) {
  const r = this.inspected.body?.message?.txnstatus_response;
  expect(r, 'message.txnstatus_response').to.exist;
  expect(r.txn_type, 'txnstatus_response.txn_type').to.equal(txnType);
  expect(r.txn_status, 'txnstatus_response.txn_status').to.exist;
});

Then('every subscription should be confirmed with a subscription code', function () {
  const items = this.inspected.body?.message?.subscribe_response || [];
  expect(items, 'subscribe_response').to.not.be.empty;
  items.forEach((item, i) => {
    expect(item.status, `subscribe_response[${i}].status`).to.equal('succ');
    expect(item.subscriptions, `subscribe_response[${i}].subscriptions`).to.not.be.empty;
    item.subscriptions.forEach((s, j) => expect(s.status, `subscriptions[${j}].status`).to.equal('subscribe'));
  });
});

Then('every subscription code should be reported as unsubscribed', function () {
  const message = this.inspected.body?.message;
  const asked = this.request.message.subscription_codes;
  expect(message.status, 'message.status').to.equal('succ');
  const reported = (message.subscription_status || []).filter((s) => s.status === 'unsubscribe').map((s) => s.code);
  expect(reported, 'unsubscribed codes').to.have.members(asked);
});

// ---------------------------------------------------------------------------
// SP-side callbacks (payloads a CRVS sends to an SP)
// ---------------------------------------------------------------------------
Given('an on-search callback carrying the {string} person record', function (person) {
  useRequest(this, searchResponseMessage([personFixture(person)]));
});

Given('an on-search callback carrying the person records {string}', function (list) {
  useRequest(this, searchResponseMessage(list.split(',').map((p) => personFixture(p.trim()))));
});

Given('an on-search callback rejected with reason code {string}', function (code) {
  useRequest(this, searchResponseMessage([], { status: 'rjct', reasonCode: code }));
});

Given('an on-search callback with an empty result', function () {
  useRequest(this, searchResponseMessage([]));
});

Given('an on-subscribe callback confirming the subscription', function () {
  useRequest(this, subscribeResponseMessage());
});

Given('an on-subscribe callback rejected with reason code {string}', function (code) {
  useRequest(this, subscribeResponseMessage({ status: 'rjct', reasonCode: code }));
});

Given('an on-unsubscribe callback confirming the unsubscription', function () {
  useRequest(this, unsubscribeResponseMessage());
});

Given('an on-unsubscribe callback rejected with reason code {string}', function (code) {
  useRequest(this, unsubscribeResponseMessage({ status: 'rjct', reasonCode: code }));
});

Given('a txn on-status callback for a {string} transaction', function (txnType) {
  useRequest(this, txnStatusResponseMessage(txnType, [personFixture('full')]));
});

Given('a notify request for a {string} event carrying the {string} person record', function (eventType, person) {
  useRequest(this, notifyMessage(eventType, [personFixture(person)]));
});

Given('a notify request for a {string} event carrying the {string} person record as a single object', function (eventType, person) {
  useRequest(this, notifyMessage(eventType, personFixture(person)));
});
