// A valid, minimal-but-realistic request for every endpoint.

import { endpoints } from './helpers.js';
import { persons, specExample } from '../fixtures/persons.js';
import {
  msgHeader, callbackHeader, envelope, searchItem, searchMessage, idTypeValueQuery,
  subscribeItem, subscribeMessage, unsubscribeMessage, txnStatusMessage,
  searchResponseMessage, subscribeResponseMessage, unsubscribeResponseMessage,
  txnStatusResponseMessage, notifyMessage,
} from './payloads.js';

export function personFixture(name) {
  if (name === 'spec example') return structuredClone(specExample);
  if (!persons[name]) throw new Error(`Unknown person fixture "${name}". Known: spec example, ${Object.keys(persons).join(', ')}`);
  return structuredClone(persons[name]);
}

export function defaultMessage(endpointName) {
  switch (endpointName) {
    case 'search':
    case 'sync search':
      return searchMessage([searchItem(idTypeValueQuery('full'))]);
    case 'subscribe':
      return subscribeMessage([subscribeItem('live_birth')]);
    case 'unsubscribe':
      return unsubscribeMessage(['SUB-0001']);
    case 'txn status':
    case 'sync txn status':
      return txnStatusMessage('search', 'transaction_id');
    case 'on-search':
      return searchResponseMessage([personFixture('full')]);
    case 'on-subscribe':
      return subscribeResponseMessage();
    case 'on-unsubscribe':
      return unsubscribeResponseMessage();
    case 'txn on-status':
      return txnStatusResponseMessage('search', [personFixture('full')]);
    case 'notify':
      return notifyMessage('live_birth', [personFixture('newborn')]);
    default:
      throw new Error(`No default message for endpoint "${endpointName}"`);
  }
}

const usesCallbackHeader = new Set(['on-search', 'notify', 'txn on-status']);

export function buildRequest(endpointName, message = defaultMessage(endpointName)) {
  const { action } = endpoints[endpointName];
  const items = message.search_request || message.subscribe_request || message.search_response
    || message.subscribe_response || message.notify_event || [message];
  const header = usesCallbackHeader.has(endpointName)
    ? callbackHeader(action, { totalCount: items.length })
    : msgHeader(action, { totalCount: items.length });
  return envelope(header, message);
}
