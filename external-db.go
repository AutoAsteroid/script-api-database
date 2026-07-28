package main

import (
	"io"
	"log"
	"net"
	"net/http"
	"os"
	"path/filepath"
	"strings"
)

const (
	HostAddress = "127.0.0.1:8080"
	AuthToken = "script-api"
	JsonDirectory = "./json"
)

func main() {
	if err := os.MkdirAll(JsonDirectory, 0755); err != nil {
		log.Fatalf("Failed to create data directory: %v", err)
	}

	http.HandleFunc("/loadJSON", handleLoadJSON)
	http.HandleFunc("/saveJSON", handleSaveJSON)

	log.Printf("External local JSON database running on %s", HostAddress)

	if err := http.ListenAndServe(HostAddress, nil); err != nil {
		log.Fatalf("Server failed: %v", err)
	}
}

// Security, IP & Header Validation Middleware Helper
func validateAndResolvePath(w http.ResponseWriter, r *http.Request) (string, bool) {
	// 1. Strict Localhost Check
	host, _, err := net.SplitHostPort(r.RemoteAddr)
	if err != nil || (host != "127.0.0.1" && host != "::1" && host != "localhost") {
		// Return 403 Forbidden and reject non-localhost callers immediately
		http.Error(w, "Forbidden: Localhost connections only", http.StatusForbidden)
		return "", false
	}

	// 2. Auth check
	if r.Header.Get("auth") != AuthToken {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return "", false
	}

	// 3. Get file path from header
	fileName := r.Header.Get("file")
	if fileName == "" {
		http.Error(w, "Missing file header", http.StatusBadRequest)
		return "", false
	}

	// Clean path to prevent Directory Traversal attacks (e.g., "../../etc/passwd")
	cleanRelPath := filepath.Clean(fileName)
	if strings.HasPrefix(cleanRelPath, "..") || filepath.IsAbs(cleanRelPath) {
		http.Error(w, "Invalid file path", http.StatusBadRequest)
		return "", false
	}

	// Append .json extension if not already present
	if !strings.HasSuffix(cleanRelPath, ".json") {
		cleanRelPath += ".json"
	}

	// Combine base data directory with clean path
	fullPath := filepath.Join(JsonDirectory, cleanRelPath)
	return fullPath, true
}

func handleLoadJSON(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method Invalid", http.StatusMethodNotAllowed)
		return
	}

	filePath, ok := validateAndResolvePath(w, r)
	if !ok {
		return
	}

	// Open the target file directly
	file, err := os.Open(filePath)
	if err != nil {
		if os.IsNotExist(err) {
			http.Error(w, "File not found", http.StatusNotFound)
		} else {
			http.Error(w, "Error reading file", http.StatusInternalServerError)
		}
		return
	}
	defer file.Close()

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)

	// Stream file bytes directly to the HTTP response writer (Zero allocation)
	_, _ = io.Copy(w, file)
}

func handleSaveJSON(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method Invalid", http.StatusMethodNotAllowed)
		return
	}

	filePath, ok := validateAndResolvePath(w, r)
	if !ok {
		return
	}

	// Automatically create nested directories if subfolders were provided in the path
	parentDir := filepath.Dir(filePath)
	if err := os.MkdirAll(parentDir, 0755); err != nil {
		http.Error(w, "Failed to create folder structure", http.StatusInternalServerError)
		return
	}

	// Create/Overwrite target file
	file, err := os.Create(filePath)
	if err != nil {
		http.Error(w, "Failed to create file", http.StatusInternalServerError)
		return
	}
	defer file.Close()

	// Stream raw request body straight into the disk file (Zero JSON parsing)
	_, err = io.Copy(file, r.Body)
	if err != nil {
		http.Error(w, "Failed to write data to disk", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
}
