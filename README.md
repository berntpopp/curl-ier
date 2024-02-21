# curl-ier.js

![curl-ier_logo](static/img/curl-ier_logo.png)

## Description
`curl-ier.js` is a Node.js script designed for making customized HTTP requests and saving the responses. It offers features like setting custom headers, sending data, handling retries on failure, and more.

## Features
- Send HTTP requests with custom headers and data.
- Support for both GET and POST requests.
- Read data from a file or a single data input.
- Save responses to a specified directory with customizable filenames.
- Retry mechanism for handling request failures.
- Customizable delay between requests.
- Resume capability from the last processed record.

## Installation
To use this script, ensure you have Node.js installed on your machine. Then, clone this repository or download the script.

```bash
git clone https://github.com/your-username/your-repository.git
cd your-repository
```

## Install the required dependencies:

```bash
npm install
```

## Usage
Run the script with Node.js, providing the necessary command-line arguments:

```bash
node curl-ier.js --url <url> --header <header1> --header <header2> ...
```

## Command-Line Arguments
- --url (-u): URL to send requests to (required).
- --header (-h): Headers for the request (optional).
- --dataRawString (-drs): Data raw string with variable placeholders (optional).
- --singleDataRaw (-s): Single data-raw value for one-time request (optional).
- --dataRawFile (-d): File containing data-raw values (optional).
- --outputFolder (-o): Folder to save responses (optional).
- --baseName (-b): Base name for output files (optional).
- --timeIntervalMin (-tmin): Minimum time interval (in seconds) between requests (optional).
- --timeIntervalMax (-tmax): Maximum time interval (in seconds) between requests (optional).
- --recordLimit (-r): Number of records to process from the input file (optional).
- --logFile (-l): Path to a log file to resume progress (optional).

## License
This project is licensed under the MIT License - see the LICENSE file for details.