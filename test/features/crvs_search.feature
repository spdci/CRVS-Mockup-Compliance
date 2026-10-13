@method=POST @endpoint=crvs/search
Feature: Asynchronous search of persons in the CRVS (POST /registry/search)

This API is exposed by the CRVS and called by SP systems or other registries.
The CRVS acknowledges the request, then delivers a SearchResponse to the
on-search callback given in header.sender_uri. The person data delivered in the
callback is checked against the CRVS person data rules.

  Background:
    Given the "search" endpoint

  @smoke
  Scenario: An async search is acknowledged
    Given a search request by identifier for the "full" test person
    Then the request should be a valid "search" message
    When the request is sent
    Then the HTTP status should be 200
    And the response should have a JSON content type
    And the response should be received within 15000 ms
    And the response should be a valid acknowledgement with ack_status "ACK"

  @functional
  Scenario Outline: Every query type is acknowledged: <query type>
    Given <request>
    Then the request should be a valid "search" message
    When the request is sent
    Then the response should be a valid acknowledgement with ack_status "ACK"

    Examples:
      | query type   | request                                                              |
      | idtype-value | a search request by identifier for the "newborn" test person         |
      | predicate    | a predicate search for female persons born on or after "1980-01-01"  |
      | expression   | an expression search request                                         |
      | graphql      | a graphql search request                                             |
      | batch        | a batch search request for the test persons "full, deceased, unknown" |

  # ---------------------------------------------------------------------------
  # Full async round trip: results are delivered to header.sender_uri
  # ---------------------------------------------------------------------------
  @callback
  Scenario Outline: Results for a <profile> person are delivered to the on-search callback
    Given a search request by identifier for the "<profile>" test person
    And the callback listener is used as sender_uri
    When the request is sent
    Then the response should be a valid acknowledgement with ack_status "ACK"
    And an "on-search" callback should be received
    And the callback should be a valid "on-search" message
    And every search result should have status "succ"
    And the result should contain the person identified by the query
    And every returned person record should be valid CRVS person data

    Examples:
      | profile   |
      | full      |
      | minimal   |
      | newborn   |
      | deceased  |
      | married   |
      | divorced  |
      | multi     |

  @callback
  Scenario: A paginated, sorted predicate search is delivered to the on-search callback
    Given a predicate search for female persons born on or after "1980-01-01"
    And the search requests page 1 with page_size 2
    And the search results are sorted by "birth_date" in "asc" order
    And the callback listener is used as sender_uri
    When the request is sent
    Then the response should be a valid acknowledgement with ack_status "ACK"
    And an "on-search" callback should be received
    And the callback should be a valid "on-search" message
    And every returned person should satisfy the predicate
    And the search result pagination should report page 1 with at most 2 records per page
    And the returned persons should be sorted by "birth_date" in "asc" order
    And every returned person record should be valid CRVS person data

  @callback
  Scenario: A batch search is answered item by item in the on-search callback
    Given a batch search request for the test persons "full, newborn, unknown"
    And the callback listener is used as sender_uri
    When the request is sent
    Then the response should be a valid acknowledgement with ack_status "ACK"
    And an "on-search" callback should be received
    And the callback should be a valid "on-search" message
    And each batch item should be answered with its own result
    And every returned person record should be valid CRVS person data

  # ---------------------------------------------------------------------------
  # Requests that break the spec must be refused
  # ---------------------------------------------------------------------------
  @negative
  Scenario Outline: An invalid async search is rejected: <case>
    Given a valid request
    And the request field "<field>" becomes '<value>'
    When the request is sent
    Then the request should be rejected according to the DCI error model

    Examples:
      | case                     | field                                                | value          |
      | missing header           | header                                               | <removed>      |
      | missing message          | message                                              | <removed>      |
      | wrong action             | header.action                                        | "on-search"    |
      | missing sender_id        | header.sender_id                                     | <removed>      |
      | invalid message_ts       | header.message_ts                                    | "2026-13-01"   |
      | sender_uri not a URI     | header.sender_uri                                    | "callback"     |
      | missing transaction_id   | message.transaction_id                               | <removed>      |
      | empty search_request     | message.search_request                               | []             |
      | missing search_criteria  | message.search_request.0.search_criteria             | <removed>      |
      | unknown query_type       | message.search_request.0.search_criteria.query_type  | "sql"          |
      | invalid locale           | message.search_request.0.locale                      | "EN"           |
      | encrypted flag without encrypted payload | header.is_msg_encrypted              | true           |

  @negative
  Scenario: A body that is not JSON is rejected
    When the raw body "{not json" is sent
    Then the request should be rejected according to the DCI error model
