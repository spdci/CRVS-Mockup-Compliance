// Validation of DCI CRVS payloads: JSON Schema (structure, types, formats, code lists)
// plus the semantic rules a schema cannot express (real calendar dates, chronology of
// life events, consistency between attributes, request/response correlation).

import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { schemas, ISO_DATE_PATTERN } from './schemas.js';

const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);

const compiled = {};
const compile = (name) => {
  if (!schemas[name]) throw new Error(`Unknown schema "${name}". Known: ${Object.keys(schemas).join(', ')}`);
  compiled[name] ??= ajv.compile(schemas[name]);
  return compiled[name];
};

const formatAjvErrors = (errors = []) => {
  // anyOf/if branches produce noisy duplicates, keep the most specific ones.
  const seen = new Set();
  return errors
    .filter((e) => !['anyOf', 'if', 'oneOf'].includes(e.keyword))
    .map((e) => {
      const where = e.instancePath || '(root)';
      const extra = e.keyword === 'enum' ? ` ${JSON.stringify(e.params.allowedValues)}`
        : e.keyword === 'const' ? ` ${JSON.stringify(e.params.allowedValue)}` : '';
      return `${where} ${e.message}${extra}`;
    })
    .filter((m) => (seen.has(m) ? false : seen.add(m)));
};

export function validateSchema(name, data) {
  const validate = compile(name);
  const valid = validate(data);
  return { valid, errors: valid ? [] : formatAjvErrors(validate.errors) };
}

// ---------------------------------------------------------------------------
// Date helpers
// ---------------------------------------------------------------------------
const isoDateRe = new RegExp(ISO_DATE_PATTERN);

export function isRealDate(value) {
  if (typeof value !== 'string' || !isoDateRe.test(value)) return false;
  const [y, m, d] = value.slice(0, 10).split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
}

// Calendar-day comparison so that "1980-03-23" and "1980-03-23T10:20:15" are the same day.
const day = (value) => value.slice(0, 10);
const present = (v) => v !== undefined && v !== null && v !== '' && !(Array.isArray(v) && v.length === 0);
const asList = (v) => (Array.isArray(v) ? v : [v]).filter(present);
const today = () => new Date(Date.now() + 24 * 3600 * 1000).toISOString().slice(0, 10); // 1 day clock-skew tolerance

const PERSON_DATE_FIELDS = ['birth_date', 'death_date', 'marriage_date', 'divorce_date', 'registration_date', 'last_updated'];

// ---------------------------------------------------------------------------
// CRVS person rules
// ---------------------------------------------------------------------------
export function checkPersonRules(person, where = 'record') {
  const errors = [];
  if (!person || typeof person !== 'object' || Array.isArray(person)) {
    return [`${where} must be an object`];
  }

  // 1. Every date that is sent must be a real calendar date and not in the future.
  for (const field of PERSON_DATE_FIELDS) {
    for (const value of asList(person[field])) {
      if (typeof value !== 'string') continue; // type errors are reported by the schema
      if (!isRealDate(value)) errors.push(`${where}.${field} "${value}" is not a valid ISO 8601 calendar date`);
      else if (day(value) > today()) errors.push(`${where}.${field} "${value}" is in the future`);
    }
  }

  // 2. Chronology of life events (only checked when both sides are present and valid).
  const valid = (field) => asList(person[field]).filter((v) => typeof v === 'string' && isRealDate(v)).map(day).sort();
  const [birth] = valid('birth_date');
  const [death] = valid('death_date');
  const marriages = valid('marriage_date');
  const divorces = valid('divorce_date');
  const [registration] = valid('registration_date');
  const [lastUpdated] = valid('last_updated');

  if (birth && death && death < birth) errors.push(`${where}.death_date ${death} is before birth_date ${birth}`);
  for (const m of marriages) {
    if (birth && m < birth) errors.push(`${where}.marriage_date ${m} is before birth_date ${birth}`);
    if (death && m > death) errors.push(`${where}.marriage_date ${m} is after death_date ${death}`);
  }
  for (const d of divorces) {
    if (birth && d < birth) errors.push(`${where}.divorce_date ${d} is before birth_date ${birth}`);
    if (marriages.length && d < marriages[0]) errors.push(`${where}.divorce_date ${d} is before the first marriage_date ${marriages[0]}`);
    if (death && d > death) errors.push(`${where}.divorce_date ${d} is after death_date ${death}`);
  }
  if (birth && registration && registration < birth) errors.push(`${where}.registration_date ${registration} is before birth_date ${birth}`);
  if (registration && lastUpdated && lastUpdated < registration) errors.push(`${where}.last_updated ${lastUpdated} is before registration_date ${registration}`);

  // 3. Marital status must not contradict recorded marriage/divorce events.
  if (person.marital_status === 'S' && (marriages.length || divorces.length)) {
    errors.push(`${where}.marital_status "S" (never married) contradicts a recorded marriage/divorce date`);
  }

  // 4. Identifiers: no duplicates, parents are other persons, parents differ.
  const key = (id) => (id && typeof id === 'object' ? `${id.identifier_type}|${id.identifier_value}` : undefined);
  const own = Array.isArray(person.identifier) ? person.identifier.map(key).filter(Boolean) : [];
  const duplicates = own.filter((k, i) => own.indexOf(k) !== i);
  if (duplicates.length) errors.push(`${where}.identifier contains duplicates: ${[...new Set(duplicates)].join(', ')}`);
  for (const parent of ['parent1_identifier', 'parent2_identifier']) {
    const k = key(person[parent]);
    if (k && own.includes(k)) errors.push(`${where}.${parent} is the person's own identifier (${k})`);
  }
  const p1 = key(person.parent1_identifier);
  if (p1 && p1 === key(person.parent2_identifier)) errors.push(`${where}.parent1_identifier and parent2_identifier are the same (${p1})`);

  // 5. Geo bounds must be a real box.
  for (const [i, address] of asList(person.address).entries()) {
    const bounds = address?.geo_location?.plus_code?.geometry?.bounds;
    const ne = bounds?.northeast;
    const sw = bounds?.southwest;
    if (typeof ne?.latitude === 'number' && typeof sw?.latitude === 'number' && ne.latitude < sw.latitude) {
      errors.push(`${where}.address[${i}] geo bounds northeast.latitude ${ne.latitude} is south of southwest.latitude ${sw.latitude}`);
    }
  }

  return errors;
}

// Schema + rules for one record.
export function validatePerson(person, where = 'record') {
  const { errors } = validateSchema('person', person);
  return [...errors.map((e) => where + e.replace(/^\(root\)/, '')), ...checkPersonRules(person, where)];
}

const recordsOf = (regRecords) => {
  if (Array.isArray(regRecords)) return regRecords;
  if (regRecords && typeof regRecords === 'object') return [regRecords];
  return [];
};

// Extracts every person record from any CRVS message (search, notify, txn status).
export function extractPersons(message) {
  const out = [];
  const fromItems = (items, path) => (Array.isArray(items) ? items : []).forEach((item, i) => {
    recordsOf(item?.data?.reg_records).forEach((r, j) => out.push({ record: r, where: `${path}[${i}].data.reg_records[${j}]` }));
  });
  if (!message || typeof message !== 'object') return out;
  fromItems(message.search_response, 'message.search_response');
  fromItems(message.notify_event, 'message.notify_event');
  fromItems(message.txnstatus_response?.txn_status?.search_response, 'message.txnstatus_response.txn_status.search_response');
  return out;
}

// ---------------------------------------------------------------------------
// Message-level rules
// ---------------------------------------------------------------------------

// Rules on a callback header (sync responses and async callbacks).
export function checkCallbackHeaderRules(header) {
  const errors = [];
  if (!header) return errors;
  if (Number.isInteger(header.total_count) && Number.isInteger(header.completed_count) && header.completed_count > header.total_count) {
    errors.push(`header.completed_count ${header.completed_count} is greater than header.total_count ${header.total_count}`);
  }
  if (header.status === 'rjct' && !header.status_reason_code) {
    errors.push('header.status is "rjct" but no header.status_reason_code explains the rejection');
  }
  return errors;
}

// Rules on a search result item, optionally against the original search_request item.
export function checkSearchResponseItem(item, where, requestItem) {
  const errors = [];
  if (!item || typeof item !== 'object') return errors;
  if (item.status === 'succ' && !item.data) errors.push(`${where}.status is "succ" but no data is returned`);
  if (item.status === 'rjct' && !item.status_reason_code) errors.push(`${where}.status is "rjct" but no status_reason_code is given`);
  if (item.status === 'rjct' && item.data && recordsOf(item.data.reg_records).length) {
    errors.push(`${where}.status is "rjct" but records are returned`);
  }
  const count = recordsOf(item.data?.reg_records).length;
  const p = item.pagination;
  if (p && Number.isInteger(p.page_size) && count > p.page_size) {
    errors.push(`${where} returns ${count} records, more than pagination.page_size ${p.page_size}`);
  }
  if (p && Number.isInteger(p.total_count) && Number.isInteger(p.page_size) && Number.isInteger(p.page_number)
      && count > Math.max(0, p.total_count - (p.page_number - 1) * p.page_size)) {
    errors.push(`${where} returns ${count} records, more than pagination.total_count ${p.total_count} allows on page ${p.page_number}`);
  }
  const requested = requestItem?.search_criteria?.pagination;
  if (requested && p) {
    if (Number.isInteger(requested.page_size) && p.page_size > requested.page_size) {
      errors.push(`${where}.pagination.page_size ${p.page_size} exceeds the requested page_size ${requested.page_size}`);
    }
    const askedPage = requested.page_number ?? 1;
    if (p.page_number !== askedPage) errors.push(`${where}.pagination.page_number ${p.page_number} is not the requested page ${askedPage}`);
  }
  return errors;
}

// Correlates a SearchResponse with the SearchRequest it answers.
export function checkSearchCorrelation(requestMessage, responseMessage, where = 'message') {
  const errors = [];
  if (!requestMessage || !responseMessage) return errors;
  if (responseMessage.transaction_id !== requestMessage.transaction_id) {
    errors.push(`${where}.transaction_id "${responseMessage.transaction_id}" does not echo the request transaction_id "${requestMessage.transaction_id}"`);
  }
  const requestItems = requestMessage.search_request || [];
  const byRef = Object.fromEntries(requestItems.map((r) => [r.reference_id, r]));
  const items = responseMessage.search_response || [];
  items.forEach((item, i) => {
    if (!(item.reference_id in byRef)) errors.push(`${where}.search_response[${i}].reference_id "${item.reference_id}" was not part of the request`);
    errors.push(...checkSearchResponseItem(item, `${where}.search_response[${i}]`, byRef[item.reference_id]));
  });
  const answered = new Set(items.map((i) => i.reference_id));
  for (const r of requestItems) {
    if (!answered.has(r.reference_id)) errors.push(`${where}: request reference_id "${r.reference_id}" has no search_response`);
  }
  return errors;
}

// Full validation of a received message of the given kind. Returns a list of errors.
export function validateMessage(kind, body, request) {
  const errors = validateSchema(kind, body).errors.map((e) => `[schema] ${e}`);
  if (!body || typeof body !== 'object') return errors;

  const header = body.header;
  const message = body.message;
  const encrypted = header?.is_msg_encrypted === true;
  const isCallback = ['on-search', 'notify', 'txn-on-status', 'sync-search-response', 'sync-txn-status-response'].includes(kind);

  if (isCallback) {
    errors.push(...checkCallbackHeaderRules(header).map((e) => `[rule] ${e}`));
    if (header?.status === 'succ' && !message) errors.push('[rule] header.status is "succ" but no message is returned');
  }
  if (encrypted || !message) return errors;

  // Search results
  if (['on-search', 'sync-search-response'].includes(kind)) {
    if (request?.message) errors.push(...checkSearchCorrelation(request.message, message).map((e) => `[rule] ${e}`));
    else (message.search_response || []).forEach((item, i) => errors.push(...checkSearchResponseItem(item, `message.search_response[${i}]`).map((e) => `[rule] ${e}`)));
  }
  if (['txn-on-status', 'sync-txn-status-response'].includes(kind)) {
    const r = message.txnstatus_response;
    if (request?.message && message.transaction_id !== request.message.transaction_id) {
      errors.push(`[rule] message.transaction_id "${message.transaction_id}" does not echo the request transaction_id "${request.message.transaction_id}"`);
    }
    const askedType = request?.message?.txnstatus_request?.txn_type;
    if (askedType && r?.txn_type && r.txn_type !== askedType) {
      errors.push(`[rule] txnstatus_response.txn_type "${r.txn_type}" does not match the requested txn_type "${askedType}"`);
    }
    (r?.txn_status?.search_response || []).forEach((item, i) => errors.push(...checkSearchResponseItem(item, `message.txnstatus_response.txn_status.search_response[${i}]`).map((e) => `[rule] ${e}`)));
  }
  if (['on-subscribe', 'on-unsubscribe'].includes(kind) && request?.message && message.transaction_id !== request.message.transaction_id) {
    errors.push(`[rule] message.transaction_id "${message.transaction_id}" does not echo the request transaction_id "${request.message.transaction_id}"`);
  }
  if (kind === 'on-subscribe') {
    (message.subscribe_response || []).forEach((item, i) => {
      if (item.status === 'rjct' && !item.status_reason_code) errors.push(`[rule] message.subscribe_response[${i}].status is "rjct" but no status_reason_code is given`);
      if (item.status === 'succ' && !(item.subscriptions || []).length) errors.push(`[rule] message.subscribe_response[${i}].status is "succ" but no subscription code is returned`);
      (item.subscriptions || []).forEach((s, j) => errors.push(...checkFrequency(s.frequency, `message.subscribe_response[${i}].subscriptions[${j}].frequency`).map((e) => `[rule] ${e}`)));
    });
  }
  if (kind === 'subscribe') {
    (message.subscribe_request || []).forEach((item, i) => errors.push(...checkFrequency(item?.subscribe_criteria?.frequency, `message.subscribe_request[${i}].subscribe_criteria.frequency`).map((e) => `[rule] ${e}`)));
  }
  if (kind === 'on-unsubscribe' && message.status === 'rjct' && !message.status_reason_code) {
    errors.push('[rule] message.status is "rjct" but no status_reason_code is given');
  }

  // Person data, wherever it appears.
  for (const { record, where } of extractPersons(message)) {
    errors.push(...checkPersonRules(record, where).map((e) => `[data] ${e}`));
  }
  return errors;
}

function checkFrequency(frequency, where) {
  if (!frequency?.start_time || !frequency?.end_time) return [];
  const start = Date.parse(frequency.start_time);
  const end = Date.parse(frequency.end_time);
  return !Number.isNaN(start) && !Number.isNaN(end) && end < start
    ? [`${where}.end_time ${frequency.end_time} is before start_time ${frequency.start_time}`]
    : [];
}

export function formatErrors(errors) {
  return errors.map((e) => `  - ${e}`).join('\n');
}
