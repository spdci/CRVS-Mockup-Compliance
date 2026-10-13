// Builders for spec-compliant DCI CRVS requests ({ signature, header, message }).

import { randomUUID } from 'node:crypto';
import { senderId, receiverId } from './helpers.js';
import { testData, testPerson } from './testdata.js';

const nowTs = () => new Date().toISOString();
const shortId = (prefix) => `${prefix}${randomUUID().replace(/-/g, '').slice(0, 12).toUpperCase()}`;

export const newTransactionId = () => shortId('TXN');
export const newReferenceId = () => shortId('REF');

export function msgHeader(action, { totalCount = 1, senderUri } = {}) {
  return {
    version: '1.0.0',
    message_id: randomUUID(),
    message_ts: nowTs(),
    action,
    sender_id: senderId,
    ...(senderUri ? { sender_uri: senderUri } : {}),
    receiver_id: receiverId,
    total_count: totalCount,
    is_msg_encrypted: false,
  };
}

export function callbackHeader(action, { status = 'succ', totalCount = 1, completedCount = totalCount } = {}) {
  return {
    version: '1.0.0',
    message_id: randomUUID(),
    message_ts: nowTs(),
    action,
    status,
    total_count: totalCount,
    completed_count: completedCount,
    sender_id: receiverId,
    receiver_id: senderId,
    is_msg_encrypted: false,
  };
}

export const envelope = (header, message) => ({ header, message });

// ----- queries -----
export function idTypeValueQuery(personName) {
  const { identifier_type, identifier_value } = testPerson(personName);
  return { query_type: 'idtype-value', query: { type: identifier_type, value: identifier_value } };
}

export function predicateQuery(conditions) {
  // conditions: [{ attribute_name, operator, attribute_value }, ...] joined with "and"
  const query = [];
  for (let i = 0; i < conditions.length; i += 2) {
    const item = { seq_num: i / 2 + 1, expression1: conditions[i] };
    if (conditions[i + 1]) Object.assign(item, { condition: 'and', expression2: conditions[i + 1] });
    query.push(item);
  }
  return { query_type: 'predicate', query };
}

export const expressionQuery = () => ({
  query_type: 'expression',
  query: { type: 'ns:org:QueryType:expression', value: { expression: 'sex = "female" and birth_date >= "1980-01-01"' } },
});

export const graphqlQuery = () => ({
  query_type: 'graphql',
  query: {
    type: 'ns:org:QueryType:graphql',
    value: { expression: 'GetBirthRecordById { person(UIN: "700000007") { BRN name sex birth_date birth_place parent1_identifier parent2_identifier } }' },
  },
});

export const consent = (type) => ({
  '@context': `https://schema.spdci.org/common/v1/api-schemas/${type}.jsonld`,
  '@type': type,
  ts: nowTs(),
  purpose: { text: 'Social protection programme eligibility', code: 'SP-ELIG', ref_uri: 'https://example.org/consent-codes' },
});

export function searchItem(criteria, { locale } = {}) {
  return {
    reference_id: newReferenceId(),
    timestamp: nowTs(),
    search_criteria: {
      version: '1.0.0',
      reg_type: testData.regType,
      reg_record_type: testData.regRecordType,
      ...criteria,
    },
    ...(locale ? { locale } : {}),
  };
}

export const searchMessage = (items) => ({ transaction_id: newTransactionId(), search_request: items });

// ----- subscriptions -----
export function subscribeItem(eventType, filterType = 'idtype-value') {
  const filter = {
    'idtype-value': () => idTypeValueQuery('full'),
    'predicate': () => predicateQuery([{ attribute_name: 'address.postal_code', operator: 'eq', attribute_value: '84320' }]),
    'expression': expressionQuery,
    'graphql': graphqlQuery,
  }[filterType]();
  const start = new Date();
  const end = new Date(start.getTime() + 365 * 24 * 3600 * 1000);
  return {
    reference_id: newReferenceId(),
    timestamp: nowTs(),
    subscribe_criteria: {
      version: '1.0.0',
      reg_type: testData.regType,
      reg_event_type: eventType,
      frequency: { start_time: start.toISOString(), end_time: end.toISOString(), frequency: '0 0 0 5,15 * ? *' },
      filter_type: filter.query_type,
      filter: filter.query,
      notify_record_type: testData.regRecordType,
      authorize: consent('Authorize'),
    },
    locale: 'eng',
  };
}

export const subscribeMessage = (items) => ({ transaction_id: newTransactionId(), subscribe_request: items });

export const unsubscribeMessage = (codes) => ({ transaction_id: newTransactionId(), timestamp: nowTs(), subscription_codes: codes });

// ----- transaction status -----
export function txnStatusMessage(txnType, attributeType) {
  const attributeValue = {
    transaction_id: newTransactionId(),
    reference_id_list: [newReferenceId(), newReferenceId()],
    correlation_id: `CORR-${randomUUID().slice(0, 8)}`,
    subscription_code_list: ['SUB-0001', 'SUB-0002'],
  }[attributeType];
  return {
    transaction_id: newTransactionId(),
    txnstatus_request: {
      reference_id: newReferenceId(),
      txn_type: txnType,
      attribute_type: attributeType,
      attribute_value: attributeValue,
      locale: 'eng',
    },
  };
}

// ----- callback payloads (what a CRVS sends to an SP) -----
const correlationId = () => `CRVS-${randomUUID().slice(0, 8)}`;

export function searchResponseMessage(records, { status = 'succ', reasonCode, transactionId = newTransactionId() } = {}) {
  return {
    transaction_id: transactionId,
    correlation_id: correlationId(),
    search_response: [{
      reference_id: newReferenceId(),
      timestamp: nowTs(),
      status,
      ...(reasonCode ? { status_reason_code: reasonCode, status_reason_message: 'Search could not be completed' } : {}),
      ...(status === 'rjct' ? {} : {
        data: { version: '1.0.0', reg_type: testData.regType, reg_record_type: testData.regRecordType, reg_records: records },
        pagination: { page_size: Math.max(records.length, 1), page_number: 1, total_count: records.length },
      }),
      locale: 'eng',
    }],
  };
}

export function subscribeResponseMessage({ status = 'succ', reasonCode } = {}) {
  const item = subscribeItem('live_birth');
  return {
    transaction_id: newTransactionId(),
    correlation_id: correlationId(),
    subscribe_response: [{
      reference_id: item.reference_id,
      timestamp: nowTs(),
      status,
      ...(reasonCode ? { status_reason_code: reasonCode, status_reason_message: 'Subscription refused' } : {}),
      ...(status === 'succ' ? {
        subscriptions: [{
          version: '1.0.0',
          code: 'SUB-0001',
          status: 'subscribe',
          timestamp: nowTs(),
          ...item.subscribe_criteria,
          locale: 'eng',
        }],
      } : {}),
      locale: 'eng',
    }],
  };
}

export function unsubscribeResponseMessage({ status = 'succ', reasonCode } = {}) {
  return {
    transaction_id: newTransactionId(),
    correlation_id: correlationId(),
    timestamp: nowTs(),
    status,
    ...(reasonCode ? { status_reason_code: reasonCode, status_reason_message: 'Unsubscribe refused' } : {}),
    subscription_status: [{ code: 'SUB-0001', status: 'unsubscribe' }],
  };
}

export function txnStatusResponseMessage(txnType, records) {
  const txnStatus = {
    search: () => {
      const m = searchResponseMessage(records);
      m.search_response[0].data.reg_records = records;
      return m;
    },
    subscribe: () => subscribeResponseMessage(),
    unsubscribe: () => unsubscribeResponseMessage(),
  }[txnType]();
  return {
    transaction_id: txnStatus.transaction_id,
    correlation_id: txnStatus.correlation_id,
    txnstatus_response: { txn_type: txnType, txn_status: txnStatus },
  };
}

export function notifyMessage(eventType, records) {
  return {
    transaction_id: newTransactionId(),
    notify_event: [{
      reference_id: newReferenceId(),
      timestamp: nowTs(),
      data: {
        version: '1.0.0',
        reg_type: testData.regType,
        reg_event_type: eventType,
        reg_record_type: testData.regRecordType,
        reg_records: records,
      },
      locale: 'eng',
    }],
  };
}

export const encryptedMessage = () => ({
  header: { alg: 'RSA-OAEP-256', enc: 'A256GCM', kid: `${senderId}|key-1` },
  ciphertext: 'eyJ0cmFuc2FjdGlvbl9pZCI6IlRYTjEyMyJ9',
  encrypted_key: 'OKOawDo13gRp2ojaHV7LFpZcgV7T6DVZKTyKOMTYUmKoTCVJRgckCL9kiMT03JGeipsEdY3mx',
  tag: 'Mz-VPPyU4RlcuYv1IwIvzw',
  iv: '48V1_ALb6US04U3b',
});

// ----- path helpers ("message.search_request.0.locale") -----
const parsePath = (path) => path.split('.').map((p) => (/^\d+$/.test(p) ? Number(p) : p));

export function getPath(obj, path) {
  return parsePath(path).reduce((o, k) => (o == null ? undefined : o[k]), obj);
}

export function setPath(obj, path, value) {
  const keys = parsePath(path);
  let o = obj;
  keys.slice(0, -1).forEach((k, i) => {
    if (o[k] == null || typeof o[k] !== 'object') o[k] = typeof keys[i + 1] === 'number' ? [] : {};
    o = o[k];
  });
  o[keys.at(-1)] = value;
}

export function deletePath(obj, path) {
  const keys = parsePath(path);
  const parent = getPath(obj, keys.slice(0, -1).join('.')) ?? (keys.length === 1 ? obj : undefined);
  if (parent && typeof parent === 'object') {
    if (Array.isArray(parent)) parent.splice(keys.at(-1), 1);
    else delete parent[keys.at(-1)];
  }
}

export const clone = (o) => structuredClone(o);
