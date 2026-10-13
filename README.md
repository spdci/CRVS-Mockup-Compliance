# CRVS Registry Compliance and Mockup

Compliance test suite and mock API for the **DCI CRVS API v1.0.0**
([`crvs_api_v1.0.0.yaml`](https://github.com/spdci/api-standards), CRVSPerson data object and
code lists from [`spdci/schemas`](https://github.com/spdci/schemas)).

## What is covered

All 11 endpoints of the standard, split by the system that exposes them:

| Side | Endpoint (mock path) | Spec path | Mock behaviour |
|---|---|---|---|
| CRVS | `crvs/sync/search` | `/registry/sync/search` | Search results (header `on-search` + SearchResponse) |
| CRVS | `crvs/search` | `/registry/search` | ACK, then `on-search` callback to `header.sender_uri` |
| CRVS | `crvs/subscribe` | `/registry/subscribe` | ACK, then `on-subscribe` callback |
| CRVS | `crvs/unsubscribe` | `/registry/unsubscribe` | ACK, then `on-unsubscribe` callback |
| CRVS | `crvs/txn/status` | `/registry/txn/status` | ACK, then `txn/on-status` callback |
| CRVS | `crvs/sync/txn/status` | `/registry/sync/txn/status` | Transaction status (header `txn-on-status` + TxnStatusResponse) |
| SP | `crvs/on-search` | `/registry/on-search` | ACK |
| SP | `crvs/on-subscribe` | `/registry/on-subscribe` | ACK |
| SP | `crvs/on-unsubscribe` | `/registry/on-unsubscribe` | ACK |
| SP | `crvs/txn/on-status` | `/registry/txn/on-status` | ACK |
| SP | `crvs/notify` | `/registry/notify` | ACK |

Every mock endpoint validates the request against the spec schema and answers an `ERR`
acknowledgement (`err.request.bad`, HTTP 400) when it does not conform.

The test suite (`test/features`, ~475 scenarios) checks, per endpoint:

- **smoke**: status, JSON content type, response time, response schema;
- **functional**: every query type (`idtype-value` with UIN/BRN/MRN/DRN, `predicate`, `expression`,
  `graphql`), batch requests, pagination, sorting, locale, consent/authorize, not-found and
  rejected results, every vital event, every status reason code, every txn type and attribute type;
- **callback**: the full async round trip. The suite starts a listener, sends it as
  `header.sender_uri`, and validates the callback the CRVS sends back;
- **negative**: requests that break the spec must be refused using one of the spec's error forms
  (`ERR` ack, HttpErrorResponse, or a `rjct` status with a reason code);
- **data** (`crvs_person_data.feature`, offline): the CRVS person data rules.

### Person data rules

Almost every CRVSPerson attribute is optional, so a record may disclose only an identifier. But
whenever an attribute **is** sent it must be correct. Every person record returned or sent by any
endpoint is checked against:

| Attribute | Rule when present |
|---|---|
| `identifier`, `parent1_identifier`, `parent2_identifier` | `identifier_type` in UIN, BRN, MRN, DRN; non-empty string `identifier_value`; `identifier` is a non-empty list without duplicates; parents differ from each other and from the person |
| `name` | object with at least `surname` or `given_name`; every part is a string |
| `phone_number` | list of E.164 numbers (`+` and up to 15 digits) |
| `email` | list of RFC 5322 addresses |
| `sex` | male, female, other, unknown |
| `marital_status` | S, M, W, A, D, L, U; not `S` if a marriage or divorce date is recorded |
| `birth_date`, `death_date`, `marriage_date`, `divorce_date`, `registration_date`, `last_updated` | ISO 8601 date or date-time, real calendar date, not in the future. `death_date`, `marriage_date`, `divorce_date` may be `""` (as in the spec example); marriage and divorce dates may be lists |
| Chronology | death ≥ birth; marriage ≥ birth and ≤ death; divorce ≥ birth, ≥ first marriage and ≤ death; registration ≥ birth; last update ≥ registration |
| `birth_place`, `death_place` | Place object; `geo` latitude in [-90, 90], longitude in [-180, 180]; `death_place` may be `""` |
| `address` | Address object or non-empty list; `country_code` ISO 3166 alpha-2/3; plus code format; geo bounds northeast ≥ southwest |

Registry-specific extension attributes are allowed.

The rules live in `test/features/support/helpers/schemas.js` (JSON Schema) and
`test/features/support/helpers/validator.js` (cross-field rules). `crvs_person_data.feature`
proves each rule: it accepts each attribute when absent, accepts correct values and rejects
incorrect ones.

### Where the spec is ambiguous

The suite accepts both forms where the published spec contradicts itself:

- `address`: single object (CRVS example) or list (core Person);
- `address_line1`/`address_line2` (CRVS example) and `address_line_1`/`address_line_2` (core Address);
- `reg_records`: an array in SearchResponse, but declared as a single object in notify and txn status;
- `reg_event_type`: bare VitalEventTypeEnum code (`live_birth`) or namespaced (`spdci-common:RegistryEventType:LiveBirth`);
- search `attribute_value` scalar types use `anyOf` (the spec's `oneOf` of integer/number rejects every integer).

## Prerequisites

Docker and Docker Compose. To run without Docker you need Node.js 18 or later.

## Run the mocks

```bash
./test_entrypoint.sh
```

The CRVS endpoints are served on port **3333** and the SP endpoints on port **3334**. Run
`GET /healthcheck` on either port to check they are up.

The mocks are generated from the test suite's schemas and person fixtures, so the two always
agree. After changing `schemas.js` or `fixtures/persons.js`, regenerate them and rebuild:

```bash
node mock/generate-mocks.mjs
```

The generated `mockoon-crvs.json` and `mockoon-sp.json` can be opened in the Mockoon desktop
app (v9 or later).

Mock test data. The mock CRVS knows these persons:

| Profile | Identifier |
|---|---|
| full (every attribute) | UIN `700000007` |
| minimal (identifier only) | UIN `100000001` |
| newborn | BRN `BRN2025000001` |
| deceased | DRN `DRN2024000123` |
| stillborn | DRN `DRN2025000099` |
| married | MRN `MRN2018000456` |
| divorced | UIN `300000003` |
| widow | UIN `600000006` |
| multi (several identifiers/addresses) | UIN `400000004` |

UIN `TOOMANY000` is rejected with `rjct.search.too_many_records_found`. Any other identifier
returns an empty result.

## Run the compliance tests

With Docker:

```bash
cd test && ./test_entrypoint.sh
```

Without Docker:

```bash
cd test && npm install && npx cucumber-js
```

Reports are written to `test/result` (HTML, JUnit XML, Cucumber messages).

### Testing your own implementation

| Variable | Default | Purpose |
|---|---|---|
| `CRVS_BASE_URL` | `http://127.0.0.1:3333/` | CRVS under test (search, subscribe, txn status, ...) |
| `SP_BASE_URL` | `http://127.0.0.1:3334/` | SP under test (on-search, notify, ...) |
| `CALLBACK_PORT` / `CALLBACK_BASE_URL` | `3335` / `http://127.0.0.1:3335/` | Listener used as `header.sender_uri`; must be reachable from the CRVS under test |
| `TEST_DATA_FILE` | none | JSON overriding the identifiers searched (see `helpers/testdata.js`) |
| `AUTH_TOKEN` | none | Sent as `Authorization: Bearer <token>` |
| `RESPONSE_TIMEOUT_MS` / `CALLBACK_TIMEOUT_MS` | `15000` / `10000` | Timeouts |
| `CUCUMBER_TAGS` (Docker only) | none | Tag expression to select scenarios |

Endpoint paths are listed in `test/features/support/helpers/helpers.js`.

Select scenarios with tags:

| Tag | Scenarios |
|---|---|
| `@smoke` | basic checks for each endpoint |
| `@functional` | use cases |
| `@callback` | async round trips (need the listener to be reachable) |
| `@negative` | invalid requests |
| `@data` | offline person data rules |
| `@strict-data` | SP must reject callbacks with invalid person data |
| `@mock` | relies on mock-only test data |

For example, to test a real CRVS:

```bash
CRVS_BASE_URL=https://crvs.example.org/ TEST_DATA_FILE=./my-data.json npx cucumber-js --tags "not @mock"
```
