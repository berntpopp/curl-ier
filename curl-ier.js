// --------------------------------------------------------------- //
// curl-ier.js
// Description: A script for making customized HTTP requests and saving responses
// --------------------------------------------------------------- //


// --------------------------------------------------------------- //
// Module Imports
// --------------------------------------------------------------- //
const yargs = require('yargs');
const axios = require('axios');
const fs = require('fs-extra');
const path = require('path');
const packageJson = require('./package.json');


// --------------------------------------------------------------- //
// Script Constants
// --------------------------------------------------------------- //
const maxRetries = 3; // Define maximum number of retries


// --------------------------------------------------------------- //
// Utility Functions
// --------------------------------------------------------------- //

/**
 * Delays execution for a given number of milliseconds.
 * @param {number} ms - The number of milliseconds to delay.
 * @returns {Promise<void>}
 */
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));


// --------------------------------------------------------------- //
// Core Functions
// --------------------------------------------------------------- //

/**
 * Sends an HTTP request to the specified URL with given headers and data.
 * @param {string} url - The URL to send the request to.
 * @param {object} headers - The headers for the request.
 * @param {string} dataRaw - The raw data to be sent in the request.
 * @param {number} retryCount - The current retry count.
 * @returns {Promise<object|null>} The response data or null in case of an error.
 */
async function sendRequest(url, headers, dataRaw, retryCount = 0) {
    try {
        let response;
        if (dataRaw) {
            response = await axios.post(url, dataRaw, { headers });
        } else {
            response = await axios.get(url, { headers });
        }
        return response.data;
    } catch (error) {
        if (retryCount < maxRetries && shouldRetry(error)) {
            console.log(`Retrying... (${retryCount + 1}/${maxRetries})`);
            return sendRequest(url, headers, dataRaw, retryCount + 1);
        }
        console.error(`Error in sending request: ${error}`);
        return null;
    }
}

/**
 * Determines whether an HTTP request should be retried based on the error received.
 * 
 * @param {object} error - The error object received from Axios.
 * @returns {boolean} Returns true if the request should be retried; false otherwise.
 * @description The function retries on network errors or specific HTTP status codes like 429.
 */
function shouldRetry(error) {
    // Define logic to determine if a request should be retried
    // Example: Retry on network errors or specific status codes
    return error.isAxiosError && (!error.response || error.response.status === 429);
}

/**
 * Reads a file and processes it to return a limited number of lines.
 * 
 * @param {string} dataRawFile - The file path to process.
 * @param {number} recordLimit - The maximum number of lines to return.
 * @returns {Promise<Array<string>>} A promise that resolves to an array of lines from the file.
 * @description Reads the file specified by dataRawFile, splits it by newline, and returns an array
 *              containing a maximum of recordLimit lines.
 */
async function processFile(dataRawFile, recordLimit) {
    if (!dataRawFile) {
        console.error("No dataRawFile specified.");
        return [];
    }

    try {
        const fileContent = await fs.readFile(dataRawFile, 'utf8');
        const lines = fileContent.split('\n');
        return lines.slice(0, recordLimit || lines.length);
    } catch (error) {
        console.error(`Error reading file ${dataRawFile}: ${error}`);
        return [];
    }
}

/**
 * Saves the given response data to a file in the specified output folder.
 * 
 * @param {string} outputFolder - The folder where the file will be saved.
 * @param {string} baseName - The base name for the output file.
 * @param {string} variable - The variable part of the file name, typically representing the request's variable data.
 * @param {string} extension - The file extension to use for the saved file.
 * @param {string} response - The response data to be saved in the file.
 * @returns {Promise<void>} A promise that resolves when the file has been saved.
 * @description Constructs a filename from the provided parameters and saves the response data to this file.
 */
async function saveResponse(outputFolder, baseName, variable, extension, response) {
    const filename = path.join(outputFolder, `${baseName}.${variable}.${extension}`);
    await fs.outputFile(filename, response);
}


// --------------------------------------------------------------- //
// Main Script Execution
// --------------------------------------------------------------- //
async function main() {
    // Configure command line arguments
    const argv = yargs
    .option('url', {
        alias: 'u',
        describe: 'URL to send requests to',
        demandOption: true,
        type: 'string'
    })
    .option('header', {
        alias: 'h',
        describe: 'Headers for the request',
        type: 'array',
        default: []
    })
    .option('dataRawString', {
        alias: 'drs',
        describe: 'Data raw string with variable placeholders',
        type: 'string'
    })
    .option('singleDataRaw', {
        alias: 's',
        describe: 'Single data-raw value for one-time request',
        type: 'string'
    })
    .option('dataRawFile', {
        alias: 'd',
        describe: 'File containing data-raw values',
        type: 'string'
    })
    .option('outputFolder', {
        alias: 'o',
        describe: 'Folder to save responses',
        default: './output',
        type: 'string'
    })
    .option('baseName', {
        alias: 'b',
        describe: 'Base name for output files',
        default: 'response',
        type: 'string'
    })
    .option('timeIntervalMin', {
        alias: 'tmin',
        describe: 'Minimum time interval (in seconds) between requests',
        type: 'number',
        default: 0.1 // Set your default min interval here
    })
    .option('timeIntervalMax', {
        alias: 'tmax',
        describe: 'Maximum time interval (in seconds) between requests',
        type: 'number',
        default: 2 // Set your default max interval here
    })
    .option('recordLimit', {
        alias: 'r',
        describe: 'Number of records to process from the input file',
        type: 'number'
    })
    .option('logFile', {
        alias: 'l',
        describe: 'Path to a log file to resume progress',
        type: 'string'
    })
    .help()
    .version(packageJson.version)
    .argv;

    // Extract command line arguments
    const { url, header, dataRawFile, dataRawString, outputFolder, baseName, timeIntervalMin, timeIntervalMax, recordLimit, logFile, singleDataRaw } = argv;

    // Parse and validate headers
    const headers = header.reduce((acc, h) => {
        if (h.includes(':')) {
            const [key, value] = h.split(':').map(s => s.trim());
            acc[key] = value;
        } else {
            console.warn(`Invalid header format: "${h}"`);
        }
        return acc;
    }, {});

    // Prepare data for requests
    let dataRawLines = [];

    if (dataRawFile) {
        // Process data from file
        dataRawLines = await processFile(dataRawFile, recordLimit);
    } else if (singleDataRaw) {
        // Process single dataRaw
        dataRawLines = [singleDataRaw];
    } else {
        // Fallback for no data raw provided
        // Allow for a request with no dataRaw
        dataRawLines = ['']; // An empty string represents no dataRaw
    }

    // Load or initialize the log object
    const log = logFile ? await fs.readJSON(logFile).catch(() => ({})) : {};

    // Process each data raw line
    for (let i = 0; i < dataRawLines.length; i++) {
        // Replace placeholders in requestData with actual data
        let requestData = dataRawString;
        if (requestData) {
            requestData = requestData.replace(/\{variable\}/g, dataRawLines[i]);
        } else {
            requestData = dataRawLines[i]; // Fallback to using raw data line directly
        }
    
        // Skip already processed data
        if (log[requestData]) continue;
    
        // Send the request
        const response = await sendRequest(url, headers, requestData);

        // Save the response
        if (response) {
            await saveResponse(outputFolder, baseName, dataRawLines[i], 'html', response); // Use dataRawLines[i] for the filename
            log[requestData] = true;
    
            // Only write to the log file if it's specified
            if (logFile) {
                await fs.writeJSON(logFile, log);
            }
    
            // Log progress
            console.log(`Processed ${i + 1}/${dataRawLines.length}`);
        }
    
        // Random delay
        const delay = Math.random() * (timeIntervalMax - timeIntervalMin) + timeIntervalMin;
        await sleep(delay * 1000);
    }
}

main().catch(error => {
    console.error(error);
    process.exit(1);
});
