@method=POST @endpoint=crvs/notify
Feature: notify from CRVS based on new birth

This API is to be exposed by the crvs.
It will be called by the SP systems or other registeries .

    @smoke
    Scenario: Successfully send notification from crvs to be processed smoke type test
        Given System previously subscribed to notification of new birth
        When CRVS send notification to subscriber for new birth
        Then The response from the notify is received
        And The notify response should have status 200
        And The notify response should have "Content-Type": "application/json" header
        And The notify response should be returned in a timely manner 15000ms
        And The notify response should match json schema