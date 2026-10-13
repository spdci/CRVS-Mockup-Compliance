@method=POST @endpoint=crvs/notify
Feature: Receive vital event notifications from the CRVS (POST /registry/notify)

This API is exposed by the SP (subscriber). The CRVS calls it whenever a
subscribed vital event occurs. The suite plays the CRVS: every notification is
first checked against the spec (including the person data rules), then the SP
must acknowledge it.

  Background:
    Given the "notify" endpoint

  @smoke
  Scenario: Successfully receive a live birth notification
    Given a notify request for a "live_birth" event carrying the "newborn" person record
    Then the request should be a valid "notify" message
    When the request is sent
    Then the HTTP status should be 200
    And the response should have a JSON content type
    And the response should be received within 15000 ms
    And the response should be a valid acknowledgement with ack_status "ACK"

  @functional
  Scenario Outline: A "<event>" notification carrying the <profile> person record is acknowledged
    Given a notify request for a "<event>" event carrying the "<profile>" person record
    Then the request should be a valid "notify" message
    When the request is sent
    Then the response should be a valid acknowledgement with ack_status "ACK"

    Examples: Vital events (VitalEventTypeEnum)
      | event       | profile   |
      | live_birth  | newborn   |
      | death       | deceased  |
      | fetal_death | stillborn |
      | marriage    | married   |
      | divorce     | divorced  |
      | adoption    | minimal   |
      | death       | widow     |

    Examples: Namespaced event types (spec example form)
      | event                                     | profile      |
      | spdci-common:RegistryEventType:LiveBirth  | newborn      |
      | spdci-common:RegistryEventType:Death      | deceased     |
      | spdci-common:RegistryEventType:Marriage   | spec example |

  @functional
  Scenario: reg_records may be a single person object, as declared in the spec
    Given a notify request for a "death" event carrying the "deceased" person record as a single object
    Then the request should be a valid "notify" message
    When the request is sent
    Then the response should be a valid acknowledgement with ack_status "ACK"

  @negative
  Scenario Outline: An invalid notification is rejected: <case>
    Given a valid request
    And the request field "<field>" becomes '<value>'
    When the request is sent
    Then the request should be rejected according to the DCI error model

    Examples: Envelope and event
      | case                     | field                                             | value          |
      | missing header           | header                                            | <removed>      |
      | wrong action             | header.action                                     | "on-search"    |
      | missing header status    | header.status                                     | <removed>      |
      | missing transaction_id   | message.transaction_id                            | <removed>      |
      | missing notify_event     | message.notify_event                              | <removed>      |
      | empty notify_event       | message.notify_event                              | []             |
      | missing reference_id     | message.notify_event.0.reference_id               | <removed>      |
      | missing timestamp        | message.notify_event.0.timestamp                  | <removed>      |
      | missing data             | message.notify_event.0.data                       | <removed>      |
      | missing reg_record_type  | message.notify_event.0.data.reg_record_type       | <removed>      |
      | missing reg_records      | message.notify_event.0.data.reg_records           | <removed>      |
      | unknown vital event      | message.notify_event.0.data.reg_event_type        | "graduation"   |
      | invalid locale           | message.notify_event.0.locale                     | "en-GB"        |

    @strict-data
    Examples: Person data in the notification
      | case                         | field                                                       | value             |
      | sex outside code list        | message.notify_event.0.data.reg_records.0.sex               | "girl"            |
      | birth_date not ISO 8601      | message.notify_event.0.data.reg_records.0.birth_date        | "01-06-2025"      |
      | parent identifier type       | message.notify_event.0.data.reg_records.0.parent1_identifier | {"identifier_type":"PASSPORT","identifier_value":"X1"} |
      | parent identifier as string  | message.notify_event.0.data.reg_records.0.parent2_identifier | "200000003"      |
      | identifier without value     | message.notify_event.0.data.reg_records.0.identifier         | [{"identifier_type":"BRN"}] |
      | name with no name part       | message.notify_event.0.data.reg_records.0.name               | {"prefix":"Baby"} |
      | birth place longitude        | message.notify_event.0.data.reg_records.0.birth_place.geo    | {"latitude":6.4,"longitude":300} |
