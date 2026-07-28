package main

/**
 * This program sets up a HTTP endpoint that lets script api save and load data to our local
 * JSON files stored in `JsonDirectory`. You must be using BDS to use @minecraft/server-net
 * and a VPS or machine that lets you run your own programs. This program must be running
 * alongside your bedrock_server executable.
 *
 * I RECOMMEND YOU USE EXTERNAL JSON FILES FOR COLD OR SHARED STORAGE ONLY. Frequent read and
 * writes is bad for disk I/O. One example could be a persistent blacklist saved across worlds. 
 */

import (
	"io"
	"log"
	"net"
	"net/http"
	"os"
	"path/filepath"
	"strings"
)

// Make sure these match the token and URL endpoint in the external-db.js implementation
const (
	HostAddress = "127.0.0.1:8080"
	AuthToken = "asteroid-db-script-api"
	JsonDirectory = "./json"
)

func main() {
	if err := os.MkdirAll(JsonDirectory, 0755); err != nil {
		log.Fatalf("Failed to create data directory: %v", err)
	}

	// Handle basic CRUD REST API operations for script API to request 
	http.HandleFunc("/loadJSON", handleLoadJSON)
	http.HandleFunc("/saveJSON", handleSaveJSON)
	http.HandleFunc("/deleteJSON", handleDeleteJSON)

	log.Printf("External local JSON database running on %s", HostAddress)

	if err := http.ListenAndServe(HostAddress, nil); err != nil {
		log.Fatalf("Server failed: %v", err)
	}
}

/**
 * Makes sure the response has valid headers and is authenticated to call this endpoint
 * This assumes the bedrock_server is running on the same machine. If you must run this on
 * on a different machine, you should remove the localhost check and change the auth token
 */
func validateAndResolvePath(w http.ResponseWriter, r *http.Request) (string, bool) {
	// Make sure our requests are only received from localhost for safety
	host, _, err := net.SplitHostPort(r.RemoteAddr)
	if err != nil || (host != "127.0.0.1" && host != "::1" && host != "localhost") {
		http.Error(w, "Forbidden", http.StatusForbidden)
		return "", false
	}

	// Even though its localhost only, this protects us from other programs running
	if r.Header.Get("auth") != AuthToken {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return "", false
	}

	// Make sure the file name header is passed (location to store JSON file)
	fileName := r.Header.Get("file")
	if fileName == "" {
		http.Error(w, "Missing file header", http.StatusBadRequest)
		return "", false
	}

	// Protection to prevent directory traversal (e.g., "../../etc/passwd")
	cleanRelPath := filepath.Clean(fileName)
	if strings.HasPrefix(cleanRelPath, "..") || filepath.IsAbs(cleanRelPath) {
		http.Error(w, "Invalid file path", http.StatusBadRequest)
		return "", false
	}

	// Append .json extension if not already present
	if !strings.HasSuffix(cleanRelPath, ".json") {
		cleanRelPath += ".json"
	}

	return filepath.Join(JsonDirectory, cleanRelPath), true
}

/**
 * Loads the provided file path under `JsonDirectory` directly into the response body
 * We stream the bytes directly to the response, allocating nothing into RAM
 */
func handleLoadJSON(w http.ResponseWriter, r *http.Request) {
	// Early validation to make sure HTTP method matches what its supposed to
	if r.Method != http.MethodGet {
		http.Error(w, "Method Invalid", http.StatusMethodNotAllowed)
		return
	}

	// Resolve the target JSON data file path after validating the request
	filePath, ok := validateAndResolvePath(w, r)
	if !ok {
		return
	}

	// Open the target file directly and make sure it exists
	file, err := os.Open(filePath)
	if err != nil {
		http.Error(w, "Failed reading file", http.StatusInternalServerError)
		return
	}
	defer file.Close()

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)

	// Stream file bytes directly to HTTP response writer with zero allocation
	_, _ = io.Copy(w, file)
}

/**
 * Saves the request BODY directly to disk at the provided file path under `JsonDirectory`
 * JSON encoding is not needed because the HTTP request body is already stringified
 */
func handleSaveJSON(w http.ResponseWriter, r *http.Request) {
	// Early validation to make sure HTTP method matches what its supposed to
	if r.Method != http.MethodPost {
		http.Error(w, "Method Invalid", http.StatusMethodNotAllowed)
		return
	}

	// Resolve the target JSON data file path after validating the request
	filePath, ok := validateAndResolvePath(w, r)
	if !ok {
		return
	}

	// Automatically create nested directories if subfolders were provided in the path
	parentDirectory := filepath.Dir(filePath)
	if err := os.MkdirAll(parentDirectory, 0755); err != nil {
		http.Error(w, "Failed to create folders", http.StatusInternalServerError)
		return
	}

	// Create/overwrite target file path
	file, err := os.Create(filePath)
	if err != nil {
		http.Error(w, "Failed to create file", http.StatusInternalServerError)
		return
	}
	defer file.Close()

	// Stream raw request body straight into the disk file with zero JSON parsing
	_, err = io.Copy(file, r.Body)
	if err != nil {
		http.Error(w, "Failed to write data to disk", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
}

/**
 * Deletes the provided JSON file at the provided file path under `JsonDirectory`
 * Returns status 200 if the deletion was successful
 */
func handleDeleteJSON(w http.ResponseWriter, r *http.Request) {
	// Early validation to make sure HTTP method matches what its supposed to
	if r.Method != http.MethodDelete {
		http.Error(w, "Method Invalid", http.StatusMethodNotAllowed)
		return
	}

	// Resolve the target JSON data file path after validating the request
	filePath, ok := validateAndResolvePath(w, r)
	if !ok {
		return
	}

	// Delete JSON file path from disk
	if err := os.Remove(filePath); err != nil {
		http.Error(w, "Failed to delete file", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
}
