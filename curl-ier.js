// --------------------------------------------------------------- //
// curl-ier.js
// Description: A script for making customized HTTP requests and saving responses
// --------------------------------------------------------------- //


// --------------------------------------------------------------- //
// Module Imports
// --------------------------------------------------------------- //
const yargs = require('yargs');
const axios = require('axios');
const qs = require('qs');
const fs = require('fs-extra');
const path = require('path');
const { format } = require('date-fns');
const packageJson = require('./package.json');
const { log } = require('console');


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
 * Optionally includes a session cookie. Retries the request upon failure.
 * @param {string} url - The URL to send the request to.
 * @param {object} headers - The headers for the request.
 * @param {string} dataRaw - The raw data to be sent in the request (for POST requests).
 * @param {string} sessionCookie - The session cookie to be included in the request.
 * @param {number} retryCount - The current retry count, defaulting to 0.
 * @returns {Promise<object|null>} The response data or null in case of an error.
 */
async function sendRequest(url, headers, dataRaw, sessionCookie, retryCount = 0) {
    try {
        let response;
        const requestOptions = {
            headers: { ...headers, 'Cookie': sessionCookie }
        };

        if (dataRaw) {
            response = await axios.post(url, dataRaw, requestOptions);
        } else {
            response = await axios.get(url, requestOptions);
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
 * Sanitizes and truncates the variable to ensure it's safe for use in filenames.
 * 
 * @param {string} variable - The variable part of the file name.
 * @param {number} maxLength - Maximum length of the sanitized string.
 * @returns {string} Sanitized and truncated string.
 */
function sanitizeAndTruncate(variable, maxLength = 200) {
    // Remove special characters
    let sanitized = variable.replace(/[^a-zA-Z0-9-_\.]/g, '');

    // Truncate to the maximum length
    return sanitized.length > maxLength ? sanitized.substring(0, maxLength) : sanitized;
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
 * @description Constructs a filename from the provided parameters, including a timestamp in the format 'yyyy-MM-dd',
 *              and saves the response data to this file.
 */
async function saveResponse(outputFolder, baseName, variable, extension, response) {
    let timestamp;
    try {
        timestamp = format(new Date(), 'yyyy-MM-dd');
    } catch (error) {
        console.error('Error formatting the date:', error);
        timestamp = 'unknown-date'; // Fallback timestamp
    }

    // Sanitize and truncate the variable
    const safeVariable = sanitizeAndTruncate(variable);

    const filename = path.join(outputFolder, `${baseName}.${safeVariable}.${timestamp}.${extension}`);
    await fs.outputFile(filename, response);
}

/**
 * Logs into a website using a POST request, retrieves the session cookie,
 * and optionally visits additional URLs to gather more cookies.
 * @param {string} loginUrl - The URL for the login request.
 * @param {string} username - The username for login.
 * @param {string} password - The password for login.
 * @param {string[]} cookieUrls - Additional URLs to visit after login for extra cookies.
 * @param {object} cookieLoginHeaders - Additional headers for the login request.
 * @returns {Promise<Array<string>>} - A promise that resolves to an array of cookies.
 */
async function loginWithCookie(loginUrl, username, password, cookieUrls, cookieLoginHeaders) {
    try {
        // Perform the login and get the initial set of cookies
        let data = qs.stringify({
            'user': username,
            'pass': password,
            'submit': 'Login',
            'logintype': 'login',
            'pid': '20,51,236,242,247,249,459,1632,563,1626@fc9c166b9b34d0c69ae148351597ea42d07a4f9a' 
        });

        let config = {
            method: 'post',
            maxBodyLength: Infinity,
            maxRedirects: 0,
            url: loginUrl,
            headers: { 
                'Content-Type': 'application/x-www-form-urlencoded',
                ...cookieLoginHeaders
            },
            data: data,
            validateStatus: function (status) {
                return status >= 200 && status < 400; // Resolve for status codes less than 400
            }
        };

        let response = await axios.request(config);
        let cookies = response.headers['set-cookie'] || [];

        // Visit additional URLs to get more cookies
        for (let url of cookieUrls) {
            let additionalResponse = await axios.get(url, {
                headers: {
                    'Cookie': cookies.join('; '),
                    ...cookieLoginHeaders
                },
                maxRedirects: 0,
                validateStatus: function (status) {
                    return status >= 200 && status < 400;
                }
            });

            let newCookies = additionalResponse.headers['set-cookie'] || [];
            cookies = cookies.concat(newCookies);
        }

        if (cookies.length === 0) {
            console.error("Login failed: No session cookie received.");
            return null;
        }

        return cookies;
    } catch (error) {
        console.error(`Error during login process: ${error}`);
        return null;
    }
}

/**
 * Visits a specified URL to collect cookies, using existing cookies and additional headers.
 * 
 * @param {string} url - The URL to visit for collecting cookies.
 * @param {Array<string>} existingCookies - Cookies to be sent with the request.
 * @param {object} cookieLoginHeaders - Headers to be included in the request.
 * @returns {Promise<Array<string>>} A promise that resolves to an array of cookies from the response.
 */
async function visitForCookies(url, existingCookies, cookieLoginHeaders) {
    try {
        const response = await axios.get(url, {
            headers: {
                'Cookie': existingCookies.join('; '),
                ...cookieLoginHeaders
            },
            maxRedirects: 0,
            validateStatus: function (status) {
                return status >= 200 && status < 400; // Accept any status code less than 400
            }
        });

        return response.headers['set-cookie'] || [];
    } catch (error) {
        console.error(`Error visiting URL for cookies: ${url}, ${error}`);
        return [];
    }
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
    .option('username', {
        alias: 'un',
        describe: 'Username for login',
        type: 'string'
    })
    .option('password', {
        alias: 'p',
        describe: 'Password for login',
        type: 'string'
    })
    .option('cookieLoginHeaders', {
        alias: 'ch',
        describe: 'Additional headers for the cookie login request in JSON format',
        type: 'string',
        coerce: arg => {
            try {
                return JSON.parse(arg);
            } catch (e) {
                console.error('Error parsing cookie login headers:', e);
                return {};
            }
        }
    })
    .option('cookieUrls', {
        alias: 'cu',
        describe: 'Additional URLs to visit for collecting cookies',
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
    .option('extension', {
        alias: 'e',
        describe: 'File extension for output files',
        default: 'html', // Default to 'html' if not specified
        type: 'string',
        choices: ['html', 'json', 'xml', 'txt', 'csv', 'tsv', 'yml']
    })
    .help()
    .version(packageJson.version)
    .argv;

    // Extract command line arguments
    const { url, header, dataRawFile, dataRawString, outputFolder, baseName, timeIntervalMin, timeIntervalMax, recordLimit, logFile, singleDataRaw, extension, loginUrl, username, password, cookieLoginHeaders, cookieUrls} = argv;

    let cookies = null;
    if (loginUrl && username && password) {
        // Login and gather cookies
        cookies = await loginWithCookie(loginUrl, username, password, cookieUrls, cookieLoginHeaders);
        if (!cookies) {
            console.error("Failed to gather necessary cookies, exiting...");
            return;
        }
    }

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
        const response = await sendRequest(url, headers, requestData, cookies);

        // Save the response
        if (response) {
            await saveResponse(outputFolder, baseName, dataRawLines[i], extension, response);
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
