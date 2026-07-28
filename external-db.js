import { system } from "@minecraft/server";
import { http, HttpRequest, HttpRequestMethod, HttpHeader } from "@minecraft/server-net";

/**
 * Only import this file if you want to be able to store cold storage 
 * locally in JSON files and are able to run the external go program
 */

const HTTP_ADDRESS = "http://127.0.0.1:8080";
const AUTH_TOKEN = "asteroid-db-script-api"; // Protect from local programs

/**
 * Reads from a JSON file stored in the external local json/ folder
 * @param {string} file The file identifier path (excluding .json)
 * @returns {Promise<any|null>} The parsed object or null on failure
 */
async function loadJSON(file) {
    const request = new HttpRequest(HTTP_ADDRESS + "/loadJSON");

    // Target file is passed in the header rather than in the URL
    request.method = HttpRequestMethod.Get;
    request.headers = [
        new HttpHeader("Content-Type", "application/json"),
        new HttpHeader("auth", AUTH_TOKEN),
        new HttpHeader("file", file)
    ];

    // Response will be return null if the file does not exist
    try {
        const response = await http.request(request);
        return JSON.parse(response);
    } catch {
        return null;
    }
}

/**
 * Writes to a JSON file stored in the external local json/ folder
 * @param {string} file The file identifier path (excluding .json)
 * @param {any} data The data object to store in the json file
 * @returns {Promise<boolean>} Success status if the write worked
 */
async function saveJSON(file, data) {
    const request = new HttpRequest(HTTP_ADDRESS + "/saveJSON");

    // Target file is passed in the header rather than body
    request.method = HttpRequestMethod.Post;

    // Go does not need to do any parsing on the actual JSON data
    request.body = JSON.stringify(data); 
    request.headers = [
        new HttpHeader("Content-Type", "application/json"),
        new HttpHeader("auth", AUTH_TOKEN),
        new HttpHeader("file", file)
    ];

    try {
        const response = await http.request(request);
        return response.status === 200;
    } catch {
        return false;
    }
}

// Attach external database access to system.database to use anywhere
system.database = { load: loadJSON, save: saveJSON };

// Alias names points directly to the system.database function object
system.db = system.database;
system.external = system.database;
