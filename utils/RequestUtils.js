let exported = {}
module.exports = exported

const fs = require('fs');
const path = require('path');
const request = require('request');

const CONFIG = require('../config');

async function executeRequest(options, expectedStatusCode) {
    return new Promise((resolve, reject) => {
        request(options, (err, response, body) => {
            if (err) {
                console.log(err);
                return resolve({
                    status: 'error',
                    error: err
                })
            }
            if (expectedStatusCode && (response.statusCode != expectedStatusCode)) {
                return resolve({
                    status: 'error',
                    error: `Got ${response.statusCode}`,
                    response: response,
                    body: body
                })
            }
            return resolve({
                status: 'success',
                response: response,
                body: body
            })
        })
    })
}

exported.executeRequest = executeRequest