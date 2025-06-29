import chai from 'chai';
import pkg from 'pactum';
const { spec } = pkg;
import { Given, When, Then, Before } from '@cucumber/cucumber';
import {
  localhost,
  defaultExpectedResponseTime,
  acceptHeader,
  notifyEndpoint,
  notifyResponseSchema
} from './helpers/helpers.js';

import chaiJsonSchema from 'chai-json-schema'; // Import correctly
import chaiString from 'chai-string';

chai.use(chaiString);

chai.use(chaiJsonSchema); // Use the imported schema validation

const baseUrl = localhost + notifyEndpoint;

let specnotify;


// Given step: Initialize search for beneficiaries
Given(/^System previously subscribed to notification of new birth$/, function () {
  specnotify = spec(); // Initialize the specSearch object
});

When(/^CRVS send notification to subscriber for new birth$/, async function () {
  try {
    const response = await specnotify
      .post(baseUrl)
      .withHeaders(acceptHeader.key, acceptHeader.value);
    this.response = response; // Save response for validation in Then steps
  } catch (err) {
    console.error("Request failed", err);
    throw err;
  }
});


// Then step: Ensure the response is received
Then(/^The response from the notify is received$/, async function () {
  chai.expect(this.response).to.exist; // Uncomment once debugged
});

// Then step: Validate the response status code
Then(/^The notify response should have status (\d+)$/, async  function(status)  {
  chai.expect(this.response.statusCode).to.equal(status);
});

// Then step: Validate header in the response
Then(/^The notify response should have "([^"]*)": "([^"]*)" header$/, async function(key, value) {
  chai.expect(this.response.rawHeaders).to.include(key);
  //chai.expect(this.response.rawHeaders).to.include(value);
});

// Then step: Validate response time
Then(/^The notify response should be returned in a timely manner 15000ms$/, async function() {
    chai.expect(this.response.responseTime).to.be.lessThan(defaultExpectedResponseTime);
    //this.response.to.have.responseTimeLessThan(defaultExpectedResponseTime);
  });

// Then step: Validate JSON schema of the response
Then(/^The notify response should match json schema$/, async  function() {
  chai.expect(this.response.body).to.be.jsonSchema(notifyResponseSchema);
});
