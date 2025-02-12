import chai from 'chai';
import pkg from 'pactum';
const { spec } = pkg;
import { Given, When, Then, Before } from '@cucumber/cucumber';
import {
  localhost,
  defaultExpectedResponseTime,
  acceptHeader,
  onstatusEndpoint,
  onstatusResponseSchema
} from './helpers/helpers.js';

import chaiJsonSchema from 'chai-json-schema'; // Import correctly
import chaiString from 'chai-string';

chai.use(chaiString);

chai.use(chaiJsonSchema); // Use the imported schema validation

const baseUrl = localhost + onstatusEndpoint;

let spectxn;


// Given step: Initialize search for beneficiaries
Given(/^SP has previously sent a txn status request to CRVS$/, function () {
  specSearch = spec(); // Initialize the specSearch object
});

When(/^CRVS completes processing and calls SP txn on-status callback$/, async function () {
  try {
    const response = await spectxn
      .post(baseUrl)
      .withHeaders(acceptHeader.key, acceptHeader.value);
    this.response = response; // Save response for validation in Then steps
  } catch (err) {
    console.error("Request failed", err);
    throw err;
  }
});


// Then step: Ensure the response is received
Then(/^SP should receive the txn on-status response from CRVS$/, async function () {
  chai.expect(this.response).to.exist; // Uncomment once debugged
});

// Then step: Validate the response status code
Then(/^The txn on-status response should have status (\d+)$/, async  function(status)  {
  chai.expect(this.response.statusCode).to.equal(status);
});

// Then step: Validate header in the response
Then(/^The txn on-status response should have "([^"]*)": "([^"]*)" header$/, async function(key, value) {
  chai.expect(this.response.rawHeaders).to.include(key);
  //chai.expect(this.response.rawHeaders).to.include(value);
});

// Then step: Validate response time
Then(/^The txn on-status response should be returned in a timely manner within 15000ms$/, async function() {
    chai.expect(this.response.responseTime).to.be.lessThan(defaultExpectedResponseTime);
    //this.response.to.have.responseTimeLessThan(defaultExpectedResponseTime);
  });

// Then step: Validate JSON schema of the response
Then(/^The txn on-status response should match the expected JSON schema$/, async  function() {
  chai.expect(this.response.body).to.be.jsonSchema(onstatusResponseSchema);
  //console.log(this.response.body.data.reg_records)
  //this.response.body.data.reg_records.forEach((jsonResponse, index) => {
   // chai.expect(jsonResponse).to.be.jsonSchema(regRecordsSchema, `Failed at index ${index}`);
  //});
});
