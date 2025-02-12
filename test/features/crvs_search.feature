@method=POST @endpoint=crvs/search
Feature: Search async from CRVS based on specific criteria

This API is to be exposed by the CRVS.
It will be called by the SP systems or other registries.

    @smoke
    Scenario: Successfully async search crvs to be processed
        Given System wants to async search for persons in crvs
        When A POST request to async search is sent
        Then The response from the async search should be received
        And The async search response should have status 200
        And The async search response should have "Content-Type": "application/json" header
        And The async search response should be returned in a timely manner within 15000ms
        And The async search response should match the expected JSON schema
