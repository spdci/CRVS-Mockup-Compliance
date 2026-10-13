@method=POST @endpoint=crvs/on-search
Feature: Receive async search results from the CRVS (POST /registry/on-search)

This API is exposed by the SP to receive search results from the CRVS.
The suite plays the CRVS: every payload it sends is first checked against the spec
(including the person data rules), then the SP must acknowledge it.

  Background:
    Given the "on-search" endpoint

  @smoke
  Scenario: Successfully receive async search results from the CRVS
    Given an on-search callback carrying the "full" person record
    Then the request should be a valid "on-search" message
    When the request is sent
    Then the HTTP status should be 200
    And the response should have a JSON content type
    And the response should be received within 15000 ms
    And the response should be a valid acknowledgement with ack_status "ACK"

  @functional
  Scenario Outline: Results carrying a <profile> person record are acknowledged
    Given an on-search callback carrying the "<profile>" person record
    Then the request should be a valid "on-search" message
    When the request is sent
    Then the response should be a valid acknowledgement with ack_status "ACK"

    Examples:
      | profile      |
      | spec example |
      | full         |
      | minimal      |
      | newborn      |
      | deceased     |
      | stillborn    |
      | married      |
      | divorced     |
      | widow        |
      | multi        |

  @functional
  Scenario: Results carrying several person records are acknowledged
    Given an on-search callback carrying the person records "full, newborn, married"
    Then the request should be a valid "on-search" message
    When the request is sent
    Then the response should be a valid acknowledgement with ack_status "ACK"

  @functional
  Scenario: An empty result is acknowledged
    Given an on-search callback with an empty result
    Then the request should be a valid "on-search" message
    When the request is sent
    Then the response should be a valid acknowledgement with ack_status "ACK"

  @functional
  Scenario Outline: A rejected search with reason code <code> is acknowledged
    Given an on-search callback rejected with reason code "<code>"
    Then the request should be a valid "on-search" message
    When the request is sent
    Then the response should be a valid acknowledgement with ack_status "ACK"

    Examples: SearchStatusReasonCode
      | code                               |
      | rjct.reference_id.invalid          |
      | rjct.reference_id.duplicate        |
      | rjct.timestamp.invalid             |
      | rjct.search_criteria.invalid       |
      | rjct.filter.invalid                |
      | rjct.sort.invalid                  |
      | rjct.pagination.invalid            |
      | rjct.search.too_many_records_found |

  @negative
  Scenario Outline: An invalid on-search callback is rejected: <case>
    Given a valid request
    And the request field "<field>" becomes '<value>'
    When the request is sent
    Then the request should be rejected according to the DCI error model

    Examples: Envelope and header
      | case                       | field                         | value          |
      | missing header             | header                        | <removed>      |
      | wrong action               | header.action                 | "search"       |
      | missing header status      | header.status                 | <removed>      |
      | unknown header status      | header.status                 | "done"         |
      | unknown header reason code | header.status_reason_code     | "rjct.unknown" |
      | missing message_ts         | header.message_ts             | <removed>      |

    Examples: Search response
      | case                         | field                                       | value             |
      | missing transaction_id       | message.transaction_id                      | <removed>         |
      | missing correlation_id       | message.correlation_id                      | <removed>         |
      | correlation_id invalid chars | message.correlation_id                      | "CRVS 0001"       |
      | missing search_response      | message.search_response                     | <removed>         |
      | missing status               | message.search_response.0.status            | <removed>         |
      | unknown status               | message.search_response.0.status            | "ok"              |
      | unknown reason code          | message.search_response.0.status_reason_code | "rjct.not_found" |
      | reason message too long      | message.search_response.0.status_reason_message | "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" |
      | data without reg_records     | message.search_response.0.data              | {"version":"1.0.0"} |
      | pagination missing total     | message.search_response.0.pagination        | {"page_size":1,"page_number":1} |
      | locale not ISO 639-3         | message.search_response.0.locale            | "en"              |

    @strict-data
    Examples: Person data in the result
      | case                         | field                                                        | value                 |
      | reg_records not an array     | message.search_response.0.data.reg_records                   | {"sex":"female"}      |
      | sex outside code list        | message.search_response.0.data.reg_records.0.sex             | "F"                   |
      | marital status outside list  | message.search_response.0.data.reg_records.0.marital_status  | "married"             |
      | identifier type outside list | message.search_response.0.data.reg_records.0.identifier.0.identifier_type | "NID"  |
      | birth_date not ISO 8601      | message.search_response.0.data.reg_records.0.birth_date      | "23/03/1980"          |
      | phone not E.164              | message.search_response.0.data.reg_records.0.phone_number   | ["0612345678"]        |
      | invalid e-mail               | message.search_response.0.data.reg_records.0.email          | ["elena.example.com"] |
      | latitude out of range        | message.search_response.0.data.reg_records.0.birth_place.geo | {"latitude":120,"longitude":0} |
      | country code not ISO 3166    | message.search_response.0.data.reg_records.0.address.country_code | "Spain"         |
