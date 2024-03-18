# curl-ier.js

![curl-ier_logo](static/img/curl-ier_logo.png)

## Description
`curl-ier.js` is a Node.js script designed for making customized HTTP requests, handling complex login procedures with advanced cookie management, and saving the responses. It's ideal for automating and simplifying the interaction with web pages and APIs that require session management.

## Features
- Send HTTP requests with custom headers and data.
- Advanced session management with cookie handling for complex login procedures.
- Support for both GET and POST requests.
- Gather cookies from multiple URLs post-login for comprehensive session management.
- Read data from a file or a single data input.
- Save responses to a specified directory with customizable, sanitized filenames, including timestamps for easy tracking.
- Retry mechanism for handling request failures.
- Customizable delay between requests.
- Resume capability from the last processed record.

## Installation
Clone the repository or download the script:

```bash
git clone https://github.com/your-username/your-repository.git
cd your-repository
```

Install the required dependencies:

```bash
npm install
```

## Usage
Run the script with Node.js, providing the necessary command-line arguments. Note that output filenames will include the current date in the format 'YYYY-MM-DD' for easy tracking.

```bash
node curl-ier.js --url <url> --header <header1> --header <header2> ...
```

## Command-Line Arguments
- `--url` (-u): URL to send requests to (required).
- `--header` (-h): Headers for the request (optional).
- `--username` (-un): Username for login (optional, required for login).
- `--password` (-p): Password for login (optional, required for login).
- `--cookieLoginHeaders` (-ch): Additional headers for cookie login requests in JSON format (optional).
- `--cookieUrls` (-cu): URLs to visit post-login for collecting additional cookies (optional).
- `--dataRawString` (-drs): Data raw string with variable placeholders (optional).
- `--singleDataRaw` (-s): Single data-raw value for one-time request (optional).
- `--dataRawFile` (-d): File containing data-raw values (optional).
- `--outputFolder` (-o): Folder to save responses (optional).
- `--baseName` (-b): Base name for output files (optional).
- `--timeIntervalMin` (-tmin): Minimum time interval (in seconds) between requests (optional).
- `--timeIntervalMax` (-tmax): Maximum time interval (in seconds) between requests (optional).
- `--recordLimit` (-r): Number of records to process from the input file (optional).
- `--logFile` (-l): Path to a log file to resume progress (optional).
- `--extension` (-e): File extension for output files (optional, defaults to 'html').

## License
This project is licensed under the MIT License - see the LICENSE file for details.
