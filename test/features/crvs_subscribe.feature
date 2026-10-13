@method=POST @endpoint=crvs/subscribe
Feature: Subscribe to CRVS vital events (POST /registry/subscribe)

This API is exposed by the CRVS and called by SP systems or other registries.
The CRVS acknowledges the request and delivers the subscription result
(SubscribeResponse with subscription codes) to the on-subscribe callback.

  Background:
    Given the "subscribe" endpoint

  @smoke
  Scenario: A subscription to live births is acknowledged
    Given a subscribe request for "live_birth" events filtered by "idtype-value"
    Then the request should be a valid "subscribe" message
    When the request is sent
    Then the HTTP status should be 200
    And the response should have a JSON content type
    And the response should be received within 15000 ms
    And the response should be a valid acknowledgement with ack_status "ACK"

  @functional
  Scenario Outline: Subscription to "<event>" events filtered by <filter type> is acknowledged
    Given a subscribe request for "<event>" events filtered by "<filter type>"
    Then the request should be a valid "subscribe" message
    When the request is sent
    Then the response should be a valid acknowledgement with ack_status "ACK"

    Examples: Vital events (VitalEventTypeEnum)
      | event       | filter type  |
      | live_birth  | idtype-value |
      | death       | idtype-value |
      | fetal_death | idtype-value |
      | marriage    | idtype-value |
      | divorce     | idtype-value |
      | adoption    | idtype-value |

    Examples: Namespaced event types (spec example form)
      | event                                     | filter type  |
      | spdci-common:RegistryEventType:LiveBirth  | predicate    |
      | spdci-common:RegistryEventType:Death      | expression   |
      | spdci-common:RegistryEventType:Marriage   | graphql      |

  @functional
  Scenario: Several subscriptions in one request are acknowledged
    Given a subscribe request for the events "live_birth, death, marriage, divorce"
    Then the request should be a valid "subscribe" message
    When the request is sent
    Then the response should be a valid acknowledgement with ack_status "ACK"

  # ---------------------------------------------------------------------------
  # Full async round trip
  # ---------------------------------------------------------------------------
  @callback
  Scenario Outline: The subscription result for "<event>" is delivered to the on-subscribe callback
    Given a subscribe request for "<event>" events filtered by "idtype-value"
    And the callback listener is used as sender_uri
    When the request is sent
    Then the response should be a valid acknowledgement with ack_status "ACK"
    And an "on-subscribe" callback should be received
    And the callback should be a valid "on-subscribe" message
    And every subscription should be confirmed with a subscription code

    Examples:
      | event      |
      | live_birth |
      | death      |
      | marriage   |

  # ---------------------------------------------------------------------------
  # Requests that break the spec must be refused
  # ---------------------------------------------------------------------------
  @negative
  Scenario Outline: An invalid subscription is rejected: <case>
    Given a valid request
    And the request field "<field>" becomes '<value>'
    When the request is sent
    Then the request should be rejected according to the DCI error model

    Examples:
      | case                         | field                                                          | value                     |
      | missing header               | header                                                         | <removed>                 |
      | wrong action                 | header.action                                                  | "search"                  |
      | missing message              | message                                                        | <removed>                 |
      | missing transaction_id       | message.transaction_id                                         | <removed>                 |
      | empty subscribe_request      | message.subscribe_request                                      | []                        |
      | missing subscribe_criteria   | message.subscribe_request.0.subscribe_criteria                 | <removed>                 |
      | missing reg_event_type       | message.subscribe_request.0.subscribe_criteria.reg_event_type  | <removed>                 |
      | unknown vital event          | message.subscribe_request.0.subscribe_criteria.reg_event_type  | "graduation"              |
      | missing filter               | message.subscribe_request.0.subscribe_criteria.filter          | <removed>                 |
      | filter not matching type     | message.subscribe_request.0.subscribe_criteria.filter          | [{"expression1":{"attribute_name":"sex","operator":"eq","attribute_value":"f"}}] |
      | unknown filter_type          | message.subscribe_request.0.subscribe_criteria.filter_type     | "sql"                     |
      | missing notify_record_type   | message.subscribe_request.0.subscribe_criteria.notify_record_type | <removed>              |
      | frequency without end_time   | message.subscribe_request.0.subscribe_criteria.frequency.end_time | <removed>              |
      | frequency start not ISO 8601 | message.subscribe_request.0.subscribe_criteria.frequency.start_time | "tomorrow"           |
      | frequency without cron       | message.subscribe_request.0.subscribe_criteria.frequency.frequency | <removed>             |
      | invalid locale               | message.subscribe_request.0.locale                             | "en"                      |
      | missing reference_id         | message.subscribe_request.0.reference_id                       | <removed>                 |
