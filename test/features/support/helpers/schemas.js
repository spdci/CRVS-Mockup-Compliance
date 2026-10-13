// JSON Schemas (draft-07) for the DCI CRVS API v1.0.0.
//
// Sources:
//  - api-standards/release/yaml/crvs_api_v1.0.0.yaml (envelopes, messages, status/reason codes)
//  - schemas/extensions/crvs/v1/data/CRVSPerson.jsonld and schemas/core/v1/{data,code}
//    (Person, Name, Identifier, Address, Place, GeoCoordinates, GeoLocation, code lists)
//
// Almost every data attribute is optional in the standard. The schemas therefore do not
// require them, but whenever an attribute IS present its type, format, code list and
// structure are enforced. Registry extensions (extra attributes) are allowed.
//
// The same definitions are embedded in the Mockoon mocks (valid_json_schema rules), so
// they deliberately use only draft-07 keywords and ajv-formats formats (no custom ones).

// ---------------------------------------------------------------------------
// Patterns
// ---------------------------------------------------------------------------
const DATE = '\\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\\d|3[01])';
const TIME = '([01]\\d|2[0-3]):[0-5]\\d(:[0-5]\\d(\\.\\d+)?)?';
const TZ = '(Z|[+-]([01]\\d|2[0-3]):?[0-5]\\d)';
// ISO 8601 calendar date, optionally with time and timezone (DCI DateTime, e.g. "1980-03-23T10:20:15").
export const ISO_DATE_PATTERN = `^${DATE}(T${TIME}${TZ}?)?$`;
// E.164 phone number, as recommended by the core Person object.
export const E164_PATTERN = '^\\+[1-9]\\d{1,14}$';
// ISO 639-3 language code, as required by the spec's `locale`.
export const LOCALE_PATTERN = '^[a-z]{3}$';
// ISO 3166-1 alpha-2 / alpha-3 country code.
export const COUNTRY_CODE_PATTERN = '^[A-Z]{2,3}$';
// Open Location Code (plus code), full or padded.
export const PLUS_CODE_PATTERN = '^[23456789CFGHJMPQRVWX0]{2,8}\\+[23456789CFGHJMPQRVWX]{0,3}$';
// Vital event types (schemas/extensions/crvs/v1/code/VitalEventTypeEnum), accepted either as
// the bare code ("live_birth") or namespaced as in the spec example
// ("spdci-common:RegistryEventType:LiveBirth").
export const VITAL_EVENT_PATTERN =
  '^([A-Za-z0-9_.-]+:)*(live_birth|LiveBirth|death|Death|fetal_death|FetalDeath|marriage|Marriage|divorce|Divorce|adoption|Adoption)$';

// ---------------------------------------------------------------------------
// Code lists
// ---------------------------------------------------------------------------
export const codes = {
  sex: ['male', 'female', 'other', 'unknown'],
  maritalStatus: ['S', 'M', 'W', 'A', 'D', 'L', 'U'],
  identifierType: ['UIN', 'BRN', 'MRN', 'DRN'],
  vitalEvent: ['live_birth', 'death', 'fetal_death', 'marriage', 'divorce', 'adoption'],
  requestStatus: ['rcvd', 'pdng', 'succ', 'rjct'],
  ackStatus: ['ACK', 'NACK', 'ERR'],
  queryType: ['idtype-value', 'expression', 'predicate', 'graphql'],
  operator: ['gt', 'lt', 'eq', 'ge', 'le', 'in'],
  condition: ['and', 'or', 'not'],
  sortOrder: ['asc', 'desc'],
  txnType: ['search', 'subscribe', 'unsubscribe'],
  attributeType: ['transaction_id', 'reference_id_list', 'correlation_id', 'subscription_code_list'],
  subscriptionStatus: ['subscribe', 'unsubscribe'],
  searchStatusReasonCode: [
    'rjct.reference_id.invalid', 'rjct.reference_id.duplicate', 'rjct.timestamp.invalid',
    'rjct.search_criteria.invalid', 'rjct.filter.invalid', 'rjct.sort.invalid',
    'rjct.pagination.invalid', 'rjct.search.too_many_records_found',
  ],
  subscribeStatusReasonCode: [
    'rjct.reference_id.invalid', 'rjct.reference_id.duplicate', 'rjct.timestamp.invalid',
    'rjct.notify_types.invalid', 'rjct.notify_details.invalid', 'rjct.person_id.invalid',
    'rjct.event.already_subscribed',
  ],
  unsubscribeStatusReasonCode: [
    'rjct.reference_id.invalid', 'rjct.reference_id.duplicate', 'rjct.timestamp.invalid',
    'rjct.subscription_code.invalid', 'rjct.requester.invalid', 'rjct.event.already_unsubscribed',
  ],
  headerStatusReasonCode: [
    'rjct.version.invalid', 'rjct.message_id.duplicate', 'rjct.message_ts.invalid',
    'rjct.action.invalid', 'rjct.action.not_supported', 'rjct.total_count.invalid',
    'rjct.total_count.limit_exceeded', 'rjct.errors.too_many',
  ],
  errorCode: [
    'err.request.bad', 'err.request.unauthorized', 'err.request.forbidden', 'err.request.not_found',
    'err.request.timeout', 'err.version.not_supported', 'err.request.too_many_requests',
    'err.sender_id.invalid', 'err.sender_uri.invalid', 'err.receiver_id.invalid',
    'err.signature.missing', 'err.signature.invalid', 'err.encryption.invalid',
    'err.service.unavailable',
  ],
};

const ref = (name) => ({ $ref: `#/definitions/${name}` });
const str = { type: 'string' };
const nonEmptyStr = { type: 'string', minLength: 1 };
const jsonLd = {
  '@context': { type: ['string', 'object'] },
  '@id': str,
  '@type': str,
};

// ---------------------------------------------------------------------------
// Definitions
// ---------------------------------------------------------------------------
export const definitions = {
  // ----- common types -----
  DateTime: { type: 'string', format: 'date-time' },
  IsoDate: { type: 'string', pattern: ISO_DATE_PATTERN },
  // The spec's own CRVSPerson example sends "" for death_date, marriage_date and divorce_date
  // when the event did not happen, so an empty string is tolerated for those attributes.
  IsoDateOrEmpty: { type: 'string', pattern: `^$|${ISO_DATE_PATTERN}` },
  TransactionId: { type: 'string', minLength: 1, maxLength: 99 },
  CorrelationId: { type: 'string', minLength: 1, maxLength: 99, pattern: '^[a-zA-Z0-9-]+$' },
  ReferenceId: nonEmptyStr,
  SubscriptionCode: { type: 'string', minLength: 1, maxLength: 99 },
  Locale: { type: 'string', pattern: LOCALE_PATTERN },
  RequestStatus: { type: 'string', enum: codes.requestStatus },
  StatusReasonMessage: { type: 'string', maxLength: 999 },
  Version: { type: 'string', minLength: 1 },
  RegType: nonEmptyStr,
  RegRecordType: nonEmptyStr,
  RegEventType: { type: 'string', pattern: VITAL_EVENT_PATTERN },
  ScalarOrObject: { type: ['string', 'number', 'boolean', 'object'] },
  Pagination: {
    type: 'object',
    required: ['page_size', 'page_number', 'total_count'],
    properties: {
      page_size: { type: 'integer', minimum: 1 },
      page_number: { type: 'integer', minimum: 1 },
      total_count: { type: 'integer', minimum: 0 },
    },
  },
  RequestPagination: {
    type: 'object',
    required: ['page_size'],
    properties: {
      page_size: { type: 'integer', minimum: 1 },
      page_number: { type: 'integer', minimum: 1 },
    },
  },
  Purpose: {
    type: 'object',
    properties: {
      text: str,
      code: str,
      ref_uri: { type: 'string', format: 'uri' },
    },
  },
  Consent: {
    type: 'object',
    properties: { ...jsonLd, ts: ref('DateTime'), purpose: ref('Purpose') },
  },

  // ----- message envelope -----
  MsgSignature: nonEmptyStr,
  Meta: { type: 'object' },
  MsgHeader: {
    type: 'object',
    required: ['message_id', 'message_ts', 'action', 'sender_id', 'total_count'],
    properties: {
      version: ref('Version'),
      message_id: nonEmptyStr,
      message_ts: ref('DateTime'),
      action: nonEmptyStr,
      sender_id: nonEmptyStr,
      sender_uri: { type: 'string', format: 'uri' },
      receiver_id: nonEmptyStr,
      total_count: { type: 'integer', minimum: 0 },
      is_msg_encrypted: { type: 'boolean' },
      meta: ref('Meta'),
    },
  },
  MsgCallbackHeader: {
    type: 'object',
    required: ['message_id', 'message_ts', 'action', 'status'],
    properties: {
      version: ref('Version'),
      message_id: nonEmptyStr,
      message_ts: ref('DateTime'),
      action: nonEmptyStr,
      status: ref('RequestStatus'),
      status_reason_code: { type: 'string', enum: codes.headerStatusReasonCode },
      status_reason_message: ref('StatusReasonMessage'),
      total_count: { type: 'integer', minimum: 0 },
      completed_count: { type: 'integer', minimum: 0 },
      sender_id: nonEmptyStr,
      receiver_id: nonEmptyStr,
      is_msg_encrypted: { type: 'boolean' },
      meta: ref('Meta'),
    },
  },
  EncryptedMessage: {
    type: 'object',
    required: ['header', 'ciphertext', 'encrypted_key', 'tag', 'iv'],
    properties: {
      header: {
        type: 'object',
        required: ['alg', 'enc', 'kid'],
        properties: { alg: nonEmptyStr, enc: nonEmptyStr, kid: nonEmptyStr },
      },
      ciphertext: nonEmptyStr,
      encrypted_key: nonEmptyStr,
      tag: nonEmptyStr,
      iv: nonEmptyStr,
    },
  },
  Error: {
    type: 'object',
    properties: {
      code: { type: 'string', enum: codes.errorCode },
      message: { type: 'string', maxLength: 999 },
    },
  },

  // ----- CRVS person data objects -----
  Identifier: {
    type: 'object',
    required: ['identifier_type', 'identifier_value'],
    properties: {
      ...jsonLd,
      identifier_type: { type: 'string', enum: codes.identifierType },
      identifier_value: nonEmptyStr,
    },
  },
  Name: {
    type: 'object',
    anyOf: [{ required: ['surname'] }, { required: ['given_name'] }],
    properties: {
      '@type': str,
      surname: str,
      given_name: str,
      second_name: str,
      maiden_name: str,
      prefix: str,
      suffix: str,
    },
  },
  GeoCoordinates: {
    type: 'object',
    required: ['latitude', 'longitude'],
    properties: {
      '@id': str,
      '@type': str,
      latitude: { type: 'number', minimum: -90, maximum: 90 },
      longitude: { type: 'number', minimum: -180, maximum: 180 },
    },
  },
  GeoLocation: {
    type: 'object',
    properties: {
      '@id': str,
      '@type': str,
      plus_code: {
        type: 'object',
        properties: {
          global_code: { type: 'string', pattern: PLUS_CODE_PATTERN },
          geometry: {
            type: 'object',
            properties: {
              '@id': str,
              '@type': str,
              bounds: {
                type: 'object',
                properties: {
                  '@id': str,
                  '@type': str,
                  northeast: ref('GeoCoordinates'),
                  southwest: ref('GeoCoordinates'),
                },
              },
              location: ref('GeoCoordinates'),
            },
          },
        },
      },
    },
  },
  Address: {
    type: 'object',
    properties: {
      ...jsonLd,
      // CRVS spec example uses address_line1/2, core Address.jsonld uses address_line_1/2.
      address_line1: str,
      address_line2: str,
      address_line_1: str,
      address_line_2: str,
      locality: str,
      sub_region_code: str,
      region_code: str,
      postal_code: str,
      country_code: { type: 'string', pattern: COUNTRY_CODE_PATTERN },
      geo_location: ref('GeoLocation'),
    },
  },
  Place: {
    type: 'object',
    properties: {
      ...jsonLd,
      name: str,
      address_line: str,
      address: str,
      geo: ref('GeoCoordinates'),
      contained_in_place: { anyOf: [{ type: 'string' }, ref('Place')] },
      contains_place: { type: 'array', items: ref('Place') },
    },
  },
  PlaceOrEmpty: { anyOf: [{ type: 'string', maxLength: 0 }, ref('Place')] },
  // Core Person declares marriage/divorce dates as @list, the CRVS example as a single value.
  EventDates: {
    anyOf: [ref('IsoDateOrEmpty'), { type: 'array', items: ref('IsoDate') }],
  },
  CRVSPerson: {
    type: 'object',
    properties: {
      ...jsonLd,
      identifier: { type: 'array', minItems: 1, items: ref('Identifier') },
      name: ref('Name'),
      phone_number: { type: 'array', items: { type: 'string', pattern: E164_PATTERN } },
      email: { type: 'array', items: { type: 'string', format: 'email' } },
      sex: { type: 'string', enum: codes.sex },
      birth_date: ref('IsoDate'),
      birth_place: ref('Place'),
      death_date: ref('IsoDateOrEmpty'),
      death_place: ref('PlaceOrEmpty'),
      // CRVS example sends a single Address, core Person declares a list.
      address: {
        anyOf: [ref('Address'), { type: 'array', minItems: 1, items: ref('Address') }],
      },
      marital_status: { type: 'string', enum: codes.maritalStatus },
      marriage_date: ref('EventDates'),
      divorce_date: ref('EventDates'),
      parent1_identifier: ref('Identifier'),
      parent2_identifier: ref('Identifier'),
      registration_date: ref('IsoDate'),
      last_updated: ref('IsoDate'),
    },
  },
  // Search responses carry an array; notify and txn status declare a single object.
  RegRecords: {
    anyOf: [{ type: 'array', items: ref('CRVSPerson') }, ref('CRVSPerson')],
  },

  // ----- queries -----
  Expression: {
    type: 'object',
    required: ['attribute_name', 'operator', 'attribute_value'],
    properties: {
      attribute_name: nonEmptyStr,
      operator: { type: 'string', enum: codes.operator },
      attribute_value: ref('ScalarOrObject'),
    },
  },
  PredicateQuery: {
    type: 'array',
    minItems: 1,
    items: {
      type: 'object',
      required: ['expression1'],
      properties: {
        seq_num: { type: 'number' },
        expression1: ref('Expression'),
        condition: { type: 'string', enum: codes.condition },
        expression2: ref('Expression'),
      },
    },
  },
  IdTypeValueQuery: {
    type: 'object',
    required: ['type', 'value'],
    properties: {
      type: nonEmptyStr,
      value: ref('ScalarOrObject'),
    },
  },
  ExpressionQuery: {
    type: 'object',
    required: ['type', 'value'],
    properties: {
      type: nonEmptyStr,
      value: { type: 'object' },
    },
  },
  // query must be consistent with query_type (shared by search_criteria and subscribe_criteria).
  Query: {
    anyOf: [ref('IdTypeValueQuery'), ref('ExpressionQuery'), ref('PredicateQuery')],
  },
  SortItem: {
    type: 'object',
    required: ['attribute_name'],
    properties: {
      attribute_name: nonEmptyStr,
      sort_order: { type: 'string', enum: codes.sortOrder },
    },
  },
  SearchCriteria: {
    type: 'object',
    required: ['query_type', 'query'],
    properties: {
      version: ref('Version'),
      reg_type: ref('RegType'),
      reg_record_type: ref('RegRecordType'),
      query_type: { type: 'string', enum: codes.queryType },
      query: ref('Query'),
      sort: { type: 'array', items: ref('SortItem') },
      pagination: ref('RequestPagination'),
      consent: ref('Consent'),
      authorize: ref('Consent'),
    },
    allOf: [
      {
        if: { properties: { query_type: { const: 'idtype-value' } }, required: ['query_type'] },
        then: { properties: { query: ref('IdTypeValueQuery') } },
      },
      {
        if: { properties: { query_type: { const: 'predicate' } }, required: ['query_type'] },
        then: { properties: { query: ref('PredicateQuery') } },
      },
      {
        if: { properties: { query_type: { enum: ['expression', 'graphql'] } }, required: ['query_type'] },
        then: { properties: { query: ref('ExpressionQuery') } },
      },
    ],
  },
  Frequency: {
    type: 'object',
    required: ['start_time', 'end_time', 'frequency'],
    properties: {
      start_time: ref('DateTime'),
      end_time: ref('DateTime'),
      frequency: nonEmptyStr,
    },
  },
  SubscribeCriteria: {
    type: 'object',
    required: ['reg_event_type', 'filter', 'notify_record_type'],
    properties: {
      version: ref('Version'),
      reg_type: ref('RegType'),
      reg_event_type: ref('RegEventType'),
      frequency: ref('Frequency'),
      filter_type: { type: 'string', enum: codes.queryType },
      filter: ref('Query'),
      notify_record_type: ref('RegRecordType'),
      authorize: ref('Consent'),
    },
    allOf: [
      {
        if: { properties: { filter_type: { const: 'idtype-value' } }, required: ['filter_type'] },
        then: { properties: { filter: ref('IdTypeValueQuery') } },
      },
      {
        if: { properties: { filter_type: { const: 'predicate' } }, required: ['filter_type'] },
        then: { properties: { filter: ref('PredicateQuery') } },
      },
      {
        if: { properties: { filter_type: { enum: ['expression', 'graphql'] } }, required: ['filter_type'] },
        then: { properties: { filter: ref('ExpressionQuery') } },
      },
    ],
  },

  // ----- messages -----
  SearchRequest: {
    type: 'object',
    required: ['transaction_id', 'search_request'],
    properties: {
      transaction_id: ref('TransactionId'),
      search_request: {
        type: 'array',
        minItems: 1,
        items: {
          type: 'object',
          required: ['reference_id', 'timestamp', 'search_criteria'],
          properties: {
            reference_id: ref('ReferenceId'),
            timestamp: ref('DateTime'),
            search_criteria: ref('SearchCriteria'),
            locale: ref('Locale'),
          },
        },
      },
    },
  },
  SearchResponseItem: {
    type: 'object',
    required: ['reference_id', 'timestamp', 'status'],
    properties: {
      reference_id: ref('ReferenceId'),
      timestamp: ref('DateTime'),
      status: ref('RequestStatus'),
      status_reason_code: { type: 'string', enum: codes.searchStatusReasonCode },
      status_reason_message: ref('StatusReasonMessage'),
      data: {
        type: 'object',
        required: ['reg_records'],
        properties: {
          version: ref('Version'),
          reg_type: ref('RegType'),
          reg_record_type: ref('RegRecordType'),
          reg_records: { type: 'array', items: ref('CRVSPerson') },
        },
      },
      pagination: ref('Pagination'),
      locale: ref('Locale'),
    },
  },
  SearchResponse: {
    type: 'object',
    required: ['transaction_id', 'correlation_id', 'search_response'],
    properties: {
      transaction_id: ref('TransactionId'),
      correlation_id: ref('CorrelationId'),
      search_response: { type: 'array', items: ref('SearchResponseItem') },
    },
  },
  SubscribeRequest: {
    type: 'object',
    required: ['transaction_id', 'subscribe_request'],
    properties: {
      transaction_id: ref('TransactionId'),
      subscribe_request: {
        type: 'array',
        minItems: 1,
        items: {
          type: 'object',
          required: ['reference_id', 'timestamp', 'subscribe_criteria'],
          properties: {
            reference_id: ref('ReferenceId'),
            timestamp: ref('DateTime'),
            subscribe_criteria: ref('SubscribeCriteria'),
            locale: ref('Locale'),
          },
        },
      },
    },
  },
  Subscription: {
    type: 'object',
    required: ['code', 'status', 'timestamp'],
    properties: {
      version: ref('Version'),
      code: ref('SubscriptionCode'),
      status: { type: 'string', enum: codes.subscriptionStatus },
      timestamp: ref('DateTime'),
      reg_type: ref('RegType'),
      reg_event_type: ref('RegEventType'),
      frequency: ref('Frequency'),
      filter_type: { type: 'string', enum: codes.queryType },
      filter: ref('Query'),
      notify_record_type: ref('RegRecordType'),
      locale: ref('Locale'),
    },
  },
  SubscribeResponse: {
    type: 'object',
    required: ['transaction_id', 'correlation_id', 'subscribe_response'],
    properties: {
      transaction_id: ref('TransactionId'),
      correlation_id: ref('CorrelationId'),
      subscribe_response: {
        type: 'array',
        items: {
          type: 'object',
          required: ['reference_id', 'timestamp', 'status'],
          properties: {
            reference_id: ref('ReferenceId'),
            timestamp: ref('DateTime'),
            status: ref('RequestStatus'),
            status_reason_code: { type: 'string', enum: codes.subscribeStatusReasonCode },
            status_reason_message: ref('StatusReasonMessage'),
            subscriptions: { type: 'array', items: ref('Subscription') },
            pagination: ref('Pagination'),
            locale: ref('Locale'),
          },
        },
      },
    },
  },
  UnSubscribeRequest: {
    type: 'object',
    required: ['transaction_id', 'timestamp', 'subscription_codes'],
    properties: {
      transaction_id: ref('TransactionId'),
      timestamp: ref('DateTime'),
      subscription_codes: { type: 'array', minItems: 1, items: ref('SubscriptionCode') },
    },
  },
  UnSubscribeResponse: {
    type: 'object',
    required: ['transaction_id', 'correlation_id', 'timestamp', 'status'],
    properties: {
      transaction_id: ref('TransactionId'),
      correlation_id: ref('CorrelationId'),
      timestamp: ref('DateTime'),
      status: ref('RequestStatus'),
      status_reason_code: { type: 'string', enum: codes.unsubscribeStatusReasonCode },
      status_reason_message: ref('StatusReasonMessage'),
      subscription_status: {
        type: 'array',
        items: {
          type: 'object',
          required: ['code', 'status'],
          properties: {
            code: ref('SubscriptionCode'),
            status: { type: 'string', enum: codes.subscriptionStatus },
          },
        },
      },
    },
  },
  NotifyEventRequest: {
    type: 'object',
    required: ['transaction_id', 'notify_event'],
    properties: {
      transaction_id: ref('TransactionId'),
      notify_event: {
        type: 'array',
        minItems: 1,
        items: {
          type: 'object',
          required: ['reference_id', 'timestamp', 'data'],
          properties: {
            reference_id: ref('ReferenceId'),
            timestamp: ref('DateTime'),
            data: {
              type: 'object',
              required: ['reg_record_type', 'reg_records'],
              properties: {
                version: ref('Version'),
                reg_type: ref('RegType'),
                reg_event_type: ref('RegEventType'),
                reg_record_type: ref('RegRecordType'),
                reg_records: ref('RegRecords'),
              },
            },
            locale: ref('Locale'),
          },
        },
      },
    },
  },
  TxnStatusRequest: {
    type: 'object',
    required: ['transaction_id', 'txnstatus_request'],
    properties: {
      transaction_id: ref('TransactionId'),
      txnstatus_request: {
        type: 'object',
        required: ['reference_id', 'txn_type', 'attribute_type', 'attribute_value'],
        properties: {
          reference_id: ref('ReferenceId'),
          txn_type: { type: 'string', enum: codes.txnType },
          attribute_type: { type: 'string', enum: codes.attributeType },
          attribute_value: {
            anyOf: [
              ref('TransactionId'),
              { type: 'array', minItems: 1, items: ref('ReferenceId') },
            ],
          },
          locale: ref('Locale'),
        },
        // attribute_value must match the declared attribute_type.
        allOf: [
          {
            if: { properties: { attribute_type: { const: 'transaction_id' } }, required: ['attribute_type'] },
            then: { properties: { attribute_value: ref('TransactionId') } },
          },
          {
            if: { properties: { attribute_type: { const: 'correlation_id' } }, required: ['attribute_type'] },
            then: { properties: { attribute_value: ref('CorrelationId') } },
          },
          {
            if: { properties: { attribute_type: { const: 'reference_id_list' } }, required: ['attribute_type'] },
            then: { properties: { attribute_value: { type: 'array', minItems: 1, items: ref('ReferenceId') } } },
          },
          {
            if: { properties: { attribute_type: { const: 'subscription_code_list' } }, required: ['attribute_type'] },
            then: { properties: { attribute_value: { type: 'array', minItems: 1, items: ref('SubscriptionCode') } } },
          },
        ],
      },
    },
  },
  TxnSearchResponse: {
    type: 'object',
    required: ['transaction_id', 'correlation_id', 'search_response'],
    properties: {
      transaction_id: ref('TransactionId'),
      correlation_id: ref('CorrelationId'),
      search_response: {
        type: 'array',
        items: {
          type: 'object',
          required: ['reference_id', 'timestamp', 'status'],
          properties: {
            reference_id: ref('ReferenceId'),
            timestamp: ref('DateTime'),
            status: ref('RequestStatus'),
            status_reason_code: { type: 'string', enum: codes.searchStatusReasonCode },
            status_reason_message: ref('StatusReasonMessage'),
            data: {
              type: 'object',
              required: ['reg_record_type', 'reg_records'],
              properties: {
                version: ref('Version'),
                reg_type: ref('RegType'),
                reg_record_type: ref('RegRecordType'),
                reg_records: ref('RegRecords'),
              },
            },
            pagination: ref('Pagination'),
            locale: ref('Locale'),
          },
        },
      },
    },
  },
  TxnStatusResponse: {
    type: 'object',
    required: ['transaction_id', 'correlation_id', 'txnstatus_response'],
    properties: {
      transaction_id: ref('TransactionId'),
      correlation_id: ref('CorrelationId'),
      txnstatus_response: {
        type: 'object',
        properties: {
          txn_type: { type: 'string', enum: codes.txnType },
          txn_status: {
            anyOf: [ref('TxnSearchResponse'), ref('SubscribeResponse'), ref('UnSubscribeResponse')],
          },
        },
        // txn_status must be the response type matching txn_type.
        allOf: [
          {
            if: { properties: { txn_type: { const: 'search' } }, required: ['txn_type'] },
            then: { properties: { txn_status: ref('TxnSearchResponse') } },
          },
          {
            if: { properties: { txn_type: { const: 'subscribe' } }, required: ['txn_type'] },
            then: { properties: { txn_status: ref('SubscribeResponse') } },
          },
          {
            if: { properties: { txn_type: { const: 'unsubscribe' } }, required: ['txn_type'] },
            then: { properties: { txn_status: ref('UnSubscribeResponse') } },
          },
        ],
      },
    },
  },

  // ----- synchronous HTTP responses -----
  AckResponse: {
    type: 'object',
    required: ['message'],
    properties: {
      message: {
        type: 'object',
        required: ['ack_status', 'timestamp', 'correlation_id'],
        properties: {
          ack_status: { type: 'string', enum: codes.ackStatus },
          timestamp: ref('DateTime'),
          error: ref('Error'),
          correlation_id: ref('CorrelationId'),
        },
        // An ERR acknowledgement must explain itself with an error code.
        if: { properties: { ack_status: { const: 'ERR' } }, required: ['ack_status'] },
        then: { required: ['error'], properties: { error: { required: ['code'] } } },
      },
    },
  },
  HttpErrorResponse: {
    type: 'object',
    required: ['errors'],
    properties: {
      errors: {
        type: 'array',
        minItems: 1,
        items: {
          type: 'object',
          required: ['code'],
          properties: { code: nonEmptyStr, message: str },
        },
      },
    },
  },
};

// ---------------------------------------------------------------------------
// Envelopes: { signature, header, message } per endpoint
// ---------------------------------------------------------------------------
const encryptedIf = {
  properties: {
    header: { properties: { is_msg_encrypted: { const: true } }, required: ['is_msg_encrypted'] },
  },
  required: ['header'],
};

function envelope({ headerDef, action, messageDef, messageRequired }) {
  return {
    type: 'object',
    required: messageRequired ? ['header', 'message'] : ['header'],
    properties: {
      signature: ref('MsgSignature'),
      header: {
        allOf: [ref(headerDef), { type: 'object', properties: { action: { const: action } } }],
      },
      message: { type: 'object' },
    },
    // message is the plain payload, or an EncryptedMessage when header.is_msg_encrypted is true.
    if: encryptedIf,
    then: { properties: { message: ref('EncryptedMessage') } },
    else: { properties: { message: ref(messageDef) } },
  };
}

export const envelopeDefinitions = {
  'search': envelope({ headerDef: 'MsgHeader', action: 'search', messageDef: 'SearchRequest', messageRequired: true }),
  'subscribe': envelope({ headerDef: 'MsgHeader', action: 'subscribe', messageDef: 'SubscribeRequest', messageRequired: true }),
  'unsubscribe': envelope({ headerDef: 'MsgHeader', action: 'unsubscribe', messageDef: 'UnSubscribeRequest', messageRequired: true }),
  'txn-status': envelope({ headerDef: 'MsgHeader', action: 'txn-status', messageDef: 'TxnStatusRequest', messageRequired: true }),
  'on-search': envelope({ headerDef: 'MsgCallbackHeader', action: 'on-search', messageDef: 'SearchResponse', messageRequired: false }),
  'on-subscribe': envelope({ headerDef: 'MsgHeader', action: 'on-subscribe', messageDef: 'SubscribeResponse', messageRequired: true }),
  'on-unsubscribe': envelope({ headerDef: 'MsgHeader', action: 'on-unsubscribe', messageDef: 'UnSubscribeResponse', messageRequired: true }),
  'notify': envelope({ headerDef: 'MsgCallbackHeader', action: 'notify', messageDef: 'NotifyEventRequest', messageRequired: false }),
  'txn-on-status': envelope({ headerDef: 'MsgCallbackHeader', action: 'txn-on-status', messageDef: 'TxnStatusResponse', messageRequired: false }),
};
envelopeDefinitions['sync-search-response'] = envelopeDefinitions['on-search'];
envelopeDefinitions['sync-txn-status-response'] = envelopeDefinitions['txn-on-status'];

// Top-level, self-contained schemas (every one embeds all definitions so it can be compiled
// on its own, which is what Mockoon's valid_json_schema rule needs).
const standalone = (root) => ({ ...root, definitions });

export const schemas = {
  ...Object.fromEntries(Object.entries(envelopeDefinitions).map(([k, v]) => [k, standalone(v)])),
  'ack': standalone(definitions.AckResponse),
  'http-error': standalone(definitions.HttpErrorResponse),
  'person': standalone(definitions.CRVSPerson),
};
