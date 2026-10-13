@method=POST @endpoint=crvs/sync/search
Feature: Synchronous search of persons in the CRVS (POST /registry/sync/search)

This API is exposed by the CRVS and called by SP systems or other registries.
The response carries a callback header (action "on-search") and a SearchResponse.
Every returned person record is checked against the CRVS person data rules:
attributes are optional, but whatever is returned must be correct.

  Background:
    Given the "sync search" endpoint

  @smoke
  Scenario: Successful sync search by UIN
    Given a search request by identifier for the "full" test person
    Then the request should be a valid "search" message
    When the request is sent
    Then the HTTP status should be 200
    And the response should have a JSON content type
    And the response should be received within 15000 ms
    And the response should be a valid "sync-search-response" message
    And every search result should have status "succ"
    And the result should contain the person identified by the query
    And every returned person record should be valid CRVS person data

  # ---------------------------------------------------------------------------
  # Search by every identifier type and every person data profile
  # ---------------------------------------------------------------------------
  @functional
  Scenario Outline: Search by <identifier type> returns correct data for a <profile> person
    Given a search request by identifier for the "<profile>" test person
    When the request is sent
    Then the response should be a valid "sync-search-response" message
    And every search result should have status "succ"
    And the result should contain the person identified by the query
    And at least 1 person record should be returned
    And every returned person record should be valid CRVS person data

    Examples:
      | identifier type | profile   |
      | UIN             | full      |
      | UIN             | minimal   |
      | BRN             | newborn   |
      | DRN             | deceased  |
      | DRN             | stillborn |
      | MRN             | married   |
      | UIN             | divorced  |
      | UIN             | widow     |
      | UIN             | multi     |

  # ---------------------------------------------------------------------------
  # Query types
  # ---------------------------------------------------------------------------
  @functional
  Scenario: Predicate search only returns persons matching every condition
    Given a predicate search for female persons born on or after "1980-01-01"
    Then the request should be a valid "search" message
    When the request is sent
    Then the response should be a valid "sync-search-response" message
    And every search result should have status "succ"
    And every returned person should satisfy the predicate
    And every returned person record should be valid CRVS person data

  @functional
  Scenario Outline: <query type> search is answered with a valid result
    Given <request>
    Then the request should be a valid "search" message
    When the request is sent
    Then the response should be a valid "sync-search-response" message
    And every returned person record should be valid CRVS person data

    Examples:
      | query type | request                     |
      | Expression | an expression search request |
      | GraphQL    | a graphql search request     |

  # ---------------------------------------------------------------------------
  # Optional search criteria: pagination, sort, locale, consent / authorize
  # ---------------------------------------------------------------------------
  @functional
  Scenario Outline: Pagination is honoured (page <page>, page_size <size>)
    Given a predicate search for female persons born on or after "1980-01-01"
    And the search requests page <page> with page_size <size>
    Then the request should be a valid "search" message
    When the request is sent
    Then the response should be a valid "sync-search-response" message
    And the search result pagination should report page <page> with at most <size> records per page
    And every returned person record should be valid CRVS person data

    Examples:
      | page | size |
      | 1    | 1    |
      | 2    | 1    |
      | 1    | 2    |
      | 1    | 100  |

  @functional
  Scenario Outline: Sorting by <attribute> <order> is honoured
    Given a predicate search for female persons born on or after "1980-01-01"
    And the search results are sorted by "<attribute>" in "<order>" order
    When the request is sent
    Then the response should be a valid "sync-search-response" message
    And the returned persons should be sorted by "<attribute>" in "<order>" order

    Examples:
      | attribute  | order |
      | birth_date | asc   |
      | birth_date | desc  |

  @functional
  Scenario: The requested locale is honoured
    Given a search request by identifier for the "full" test person
    And the search request asks for locale "fra"
    When the request is sent
    Then the response should be a valid "sync-search-response" message
    And every requested locale should be honoured

  @functional
  Scenario: A search carrying consent and authorize information is accepted
    Given a search request by identifier for the "full" test person
    And the search request carries consent and authorize information
    Then the request should be a valid "search" message
    When the request is sent
    Then the response should be a valid "sync-search-response" message
    And every search result should have status "succ"

  # ---------------------------------------------------------------------------
  # Batch, not found, rejection by the registry
  # ---------------------------------------------------------------------------
  @functional
  Scenario: A batch search answers every request item with its own result
    Given a batch search request for the test persons "full, newborn, deceased, married, unknown"
    Then the request should be a valid "search" message
    When the request is sent
    Then the response should be a valid "sync-search-response" message
    And each batch item should be answered with its own result
    And every returned person record should be valid CRVS person data

  @functional
  Scenario: Searching an unknown person returns no record or a coded rejection
    Given a search request by identifier for the "unknown" test person
    When the request is sent
    Then the response should be a valid "sync-search-response" message
    And the search result should be empty or rejected with a valid reason code

  @functional @mock
  Scenario: A rejected search item carries a spec reason code and no data
    Given a search request by identifier for the "too_many" test person
    When the request is sent
    Then the response should be a valid "sync-search-response" message
    And the search result should be rejected with reason code "rjct.search.too_many_records_found"

  # ---------------------------------------------------------------------------
  # Requests that break the spec must be refused
  # ---------------------------------------------------------------------------
  @negative
  Scenario Outline: An invalid request is rejected: <case>
    Given a valid request
    And the request field "<field>" becomes '<value>'
    When the request is sent
    Then the request should be rejected according to the DCI error model

    Examples: Envelope and header
      | case                       | field                | value          |
      | missing header             | header               | <removed>      |
      | missing message            | message              | <removed>      |
      | wrong action               | header.action        | "subscribe"    |
      | missing message_id         | header.message_id    | <removed>      |
      | missing message_ts         | header.message_ts    | <removed>      |
      | message_ts not ISO 8601    | header.message_ts    | "13/10/2026"   |
      | missing sender_id          | header.sender_id     | <removed>      |
      | missing total_count        | header.total_count   | <removed>      |
      | total_count not an integer | header.total_count   | "one"          |
      | sender_uri not a URI       | header.sender_uri    | "not a uri"    |
      | is_msg_encrypted not bool  | header.is_msg_encrypted | "no"        |

    Examples: Search request
      | case                         | field                                                   | value                                   |
      | missing transaction_id       | message.transaction_id                                  | <removed>                               |
      | transaction_id too long      | message.transaction_id                                  | "TXN0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000" |
      | missing search_request       | message.search_request                                  | <removed>                               |
      | empty search_request         | message.search_request                                  | []                                      |
      | missing reference_id         | message.search_request.0.reference_id                   | <removed>                               |
      | missing timestamp            | message.search_request.0.timestamp                      | <removed>                               |
      | invalid timestamp            | message.search_request.0.timestamp                      | "yesterday"                             |
      | missing search_criteria      | message.search_request.0.search_criteria                | <removed>                               |
      | missing query_type           | message.search_request.0.search_criteria.query_type     | <removed>                               |
      | unknown query_type           | message.search_request.0.search_criteria.query_type     | "sql"                                   |
      | missing query                | message.search_request.0.search_criteria.query          | <removed>                               |
      | query not matching type      | message.search_request.0.search_criteria.query          | [{"expression1":{"attribute_name":"sex","operator":"eq","attribute_value":"female"}}] |
      | idtype-value without value   | message.search_request.0.search_criteria.query          | {"type":"UIN"}                          |
      | invalid locale               | message.search_request.0.locale                         | "english"                               |
      | pagination without page_size | message.search_request.0.search_criteria.pagination     | {"page_number":1}                       |
      | page_size zero               | message.search_request.0.search_criteria.pagination     | {"page_size":0}                         |
      | invalid sort order           | message.search_request.0.search_criteria.sort           | [{"attribute_name":"birth_date","sort_order":"up"}] |
      | consent with invalid ts      | message.search_request.0.search_criteria.consent        | {"ts":"now"}                            |

    Examples: Predicate query
      | case                         | field                                                   | value                                   |
      | unknown operator             | message.search_request.0.search_criteria                | {"query_type":"predicate","query":[{"expression1":{"attribute_name":"sex","operator":"like","attribute_value":"f"}}]} |
      | unknown condition            | message.search_request.0.search_criteria                | {"query_type":"predicate","query":[{"expression1":{"attribute_name":"sex","operator":"eq","attribute_value":"f"},"condition":"xor","expression2":{"attribute_name":"sex","operator":"eq","attribute_value":"m"}}]} |
      | expression without operator  | message.search_request.0.search_criteria                | {"query_type":"predicate","query":[{"expression1":{"attribute_name":"sex","attribute_value":"f"}}]} |
      | empty predicate              | message.search_request.0.search_criteria                | {"query_type":"predicate","query":[]}  |

  @negative
  Scenario: A body that is not JSON is rejected
    When the raw body "this is not json" is sent
    Then the request should be rejected according to the DCI error model
