@method=POST @endpoint=crvs/on-subscribe
Feature: Callback for Subscribe To CRVS based on specific criteria

This API is to be exposed by the CRVS.
It will be called by the SP systems or other registeries .

    @smoke
    Scenario: Successfully subscribe to get new persons from crvs to be processed smoke type test
        Given System wanna subscribe to get new persons from crvs
        When POST request to subscribe is sent
        Then The response from the subscribe is received
        And The subscribe response should have status 200
        And The subscribe response should have "Content-Type": "application/json" header
        And The subscribe response should be returned in a timely manner 15000ms
        And The subscribe response should match json schema