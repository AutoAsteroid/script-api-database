import { system } from "@minecraft/server";
import { http, HttpRequest, HttpRequestMethod, HttpHeader } from "@minecraft/server-net";

/**
 * ONLY import this file if you are on a BDS server, and intend on using external JSON file databases.
 */

const HTTP_ADDRESS = "http://127.0.0.1:8080";
const AUTH_TOKEN = "script-api";

/**
 * Reads a JSON file stored on the external backend
 * @param {string} file The file identifier (excluding .json)
 * @returns {Promise<any|null>} The parsed object or null on failure
 */
async function loadJSON(file) {
    const request = new HttpRequest(`${HTTP_ADDRESS}/loadJSON`);
    request.method = HttpRequestMethod.Post;
    request.body = JSON.stringify({ file });
    request.headers = [
        new HttpHeader("Content-Type", "application/json"),
        new HttpHeader("auth", AUTH_TOKEN)
    ];

    try {
        const response = await http.request(request);
        return JSON.parse(response);
    } catch {
        return null;
    }
}

/**
 * Writes a JSON file stored on the external backend
 * @param {string} file The file identifier (excluding .json)
 * @param {any} data The data object to store
 * @returns {Promise<boolean>} Success status
 */
async function saveJSON(file, data) {
    const request = new HttpRequest(`${HTTP_ADDRESS}/saveJSON`);
    request.method = HttpRequestMethod.Post;
    request.body = JSON.stringify({ file, json: data });
    request.headers = [
        new HttpHeader("Content-Type", "application/json"),
        new HttpHeader("auth", AUTH_TOKEN)
    ];

    return await http.request(request)
        .then(() => true)
        .catch(() => false);
}

// Attach external database access to system.database to use anywhere
system.database = { load: loadJSON, save: saveJSON };

// system.db alias points directly to system.database function object
system.db = system.database;
