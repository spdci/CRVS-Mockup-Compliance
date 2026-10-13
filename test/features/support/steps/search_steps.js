import { Given, Then } from '@cucumber/cucumber';
import chai from 'chai';
import {
  searchItem, searchMessage, idTypeValueQuery, predicateQuery, expressionQuery, graphqlQuery, consent,
} from '../helpers/payloads.js';
import { codes } from '../helpers/schemas.js';
import { useRequest } from './common_steps.js';

const { expect } = chai;

const items = (world) => world.request.message.search_request;
const results = (world) => {
  const message = world.inspected.body?.message;
  return message?.search_response || message?.txnstatus_response?.txn_status?.search_response || [];
};
const recordsOf = (item) => {
  const r = item?.data?.reg_records;
  return Array.isArray(r) ? r : r ? [r] : [];
};

// ---------------------------------------------------------------------------
// Building search requests
// ---------------------------------------------------------------------------
Given('a search request by identifier for the {string} test person', function (person) {
  useRequest(this, searchMessage([searchItem(idTypeValueQuery(person))]));
});

Given('a batch search request for the test persons {string}', function (list) {
  const people = list.split(',').map((p) => p.trim());
  useRequest(this, searchMessage(people.map((p) => searchItem(idTypeValueQuery(p)))));
});

Given('a predicate search for female persons born on or after {string}', function (date) {
  this.predicate = [
    { attribute_name: 'sex', operator: 'eq', attribute_value: 'female' },
    { attribute_name: 'birth_date', operator: 'ge', attribute_value: date },
  ];
  useRequest(this, searchMessage([searchItem(predicateQuery(this.predicate))]));
});

Given('an expression search request', function () {
  useRequest(this, searchMessage([searchItem(expressionQuery())]));
});

Given('a graphql search request', function () {
  useRequest(this, searchMessage([searchItem(graphqlQuery())]));
});

Given('the search requests page {int} with page_size {int}', function (page, size) {
  items(this).forEach((i) => { i.search_criteria.pagination = { page_size: size, page_number: page }; });
});

Given('the search results are sorted by {string} in {string} order', function (attribute, order) {
  items(this).forEach((i) => { i.search_criteria.sort = [{ attribute_name: attribute, sort_order: order }]; });
});

Given('the search request asks for locale {string}', function (locale) {
  items(this).forEach((i) => { i.locale = locale; });
});

Given('the search request carries consent and authorize information', function () {
  items(this).forEach((i) => {
    i.search_criteria.consent = consent('Consent');
    i.search_criteria.authorize = consent('Authorize');
  });
});

// ---------------------------------------------------------------------------
// Functional checks on search results (response of sync search, on-search callback,
// txn status of a search)
// ---------------------------------------------------------------------------
Then('every search result should have status {string}', function (status) {
  const r = results(this);
  expect(r, 'search_response').to.not.be.empty;
  r.forEach((item, i) => expect(item.status, `search_response[${i}].status`).to.equal(status));
});

Then('the result should contain the person identified by the query', function () {
  const r = results(this);
  items(this).forEach((requestItem) => {
    const { type, value } = requestItem.search_criteria.query;
    const item = r.find((x) => x.reference_id === requestItem.reference_id);
    expect(item, `result for reference_id ${requestItem.reference_id}`).to.exist;
    const records = recordsOf(item);
    expect(records, `records for ${type} ${value}`).to.not.be.empty;
    records.forEach((record, j) => {
      const ids = (record.identifier || []).map((id) => `${id.identifier_type}|${id.identifier_value}`);
      expect(ids, `reg_records[${j}] does not carry the queried identifier ${type} ${value}`).to.include(`${type}|${value}`);
    });
  });
});

Then('every returned person should satisfy the predicate', function () {
  const compare = (actual, op, expected) => {
    const a = typeof actual === 'string' && /^\d{4}-\d{2}-\d{2}/.test(actual) ? actual.slice(0, 10) : actual;
    switch (op) {
      case 'eq': return a === expected;
      case 'gt': return a > expected;
      case 'lt': return a < expected;
      case 'ge': return a >= expected;
      case 'le': return a <= expected;
      case 'in': return Array.isArray(expected) ? expected.includes(a) : String(expected).split(',').includes(a);
      default: return true;
    }
  };
  results(this).flatMap(recordsOf).forEach((record, j) => {
    for (const { attribute_name: name, operator, attribute_value: value } of this.predicate) {
      if (record[name] === undefined) continue; // optional attribute not disclosed
      expect(compare(record[name], operator, value), `reg_records[${j}].${name} = ${JSON.stringify(record[name])} does not satisfy "${operator} ${JSON.stringify(value)}"`).to.be.true;
    }
  });
});

Then('the returned persons should be sorted by {string} in {string} order', function (attribute, order) {
  results(this).forEach((item, i) => {
    const values = recordsOf(item).map((r) => r[attribute]).filter((v) => v !== undefined);
    const sorted = [...values].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
    if (order === 'desc') sorted.reverse();
    expect(values, `search_response[${i}] ${attribute} order`).to.deep.equal(sorted);
  });
});

Then('the search result pagination should report page {int} with at most {int} record(s) per page', function (page, size) {
  results(this).forEach((item, i) => {
    expect(item.pagination, `search_response[${i}].pagination`).to.exist;
    expect(item.pagination.page_number, `search_response[${i}].pagination.page_number`).to.equal(page);
    expect(item.pagination.page_size, `search_response[${i}].pagination.page_size`).to.be.at.most(size);
    expect(recordsOf(item).length, `search_response[${i}] record count`).to.be.at.most(size);
  });
});

Then('every requested locale should be honoured', function () {
  const asked = Object.fromEntries(items(this).map((i) => [i.reference_id, i.locale]));
  results(this).forEach((item, i) => {
    if (item.locale !== undefined && asked[item.reference_id]) {
      expect(item.locale, `search_response[${i}].locale`).to.equal(asked[item.reference_id]);
    }
  });
});

Then('the search result should be empty or rejected with a valid reason code', function () {
  const r = results(this);
  expect(r, 'search_response').to.not.be.empty;
  r.forEach((item, i) => {
    if (item.status === 'rjct') {
      expect(codes.searchStatusReasonCode, `search_response[${i}].status_reason_code`).to.include(item.status_reason_code);
    } else {
      expect(recordsOf(item), `search_response[${i}] records for an unknown person`).to.be.empty;
      if (item.pagination) expect(item.pagination.total_count, `search_response[${i}].pagination.total_count`).to.equal(0);
    }
  });
});

Then('the search result should be rejected with reason code {string}', function (code) {
  const r = results(this);
  expect(r, 'search_response').to.not.be.empty;
  r.forEach((item, i) => {
    expect(item.status, `search_response[${i}].status`).to.equal('rjct');
    expect(item.status_reason_code, `search_response[${i}].status_reason_code`).to.equal(code);
  });
});

Then('each batch item should be answered with its own result', function () {
  const r = results(this);
  const refs = items(this).map((i) => i.reference_id);
  expect(r.map((x) => x.reference_id).sort(), 'answered reference_ids').to.deep.equal([...refs].sort());
  items(this).forEach((requestItem) => {
    const item = r.find((x) => x.reference_id === requestItem.reference_id);
    const { type, value } = requestItem.search_criteria.query;
    recordsOf(item).forEach((record) => {
      const ids = (record.identifier || []).map((id) => `${id.identifier_type}|${id.identifier_value}`);
      expect(ids, `batch result ${item.reference_id} returned a record that does not match ${type} ${value}`).to.include(`${type}|${value}`);
    });
  });
});
