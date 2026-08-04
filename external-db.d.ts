import "@minecraft/server";

/**
 * External HTTP local JSON file database wrapper. (Relies on external-db.go to be running)
 * Enables data persistence outside the Script API environment in local external JSON files.
 */
export interface ExternalDatabase {
    /**
     * Reads and parses a JSON file stored in the external local JSON data folder.
     * @template T Optional type hint for the returned JSON payload.
     * @param file The file identifier path (excluding .json).
     * @returns A promise resolving to the parsed object, or null on failure.
     */
    load<T = any>(file: string): Promise<T | null>;

    /**
     * Writes a data object to a JSON file in the external local JSON data folder.
     * @template T The type of data being saved.
     * @param file The file identifier path (excluding .json).
     * @param data The data object to store in the JSON file.
     * @returns A promise resolving to `true` if the write succeeded (status 200).
     */
    save<T = any>(file: string, data: T): Promise<boolean>;

    /**
     * Deletes a JSON file stored in the external local JSON data folder.
     * @param file The file identifier path (excluding .json).
     * @returns A promise resolving to `true` if the delete succeeded (status 200).
     */
    delete(file: string): Promise<boolean>;
}

// ------------------------------------------------------------------------------
// Decorates Bedrock's native `system` instance with .database, .db, and .external
// ------------------------------------------------------------------------------

declare module "@minecraft/server" {
    interface system {
        /** External HTTP local JSON database file bridge. */
        database: ExternalDatabase;
        /** External HTTP local JSON database file bridge. */
        db: ExternalDatabase;
        /** External HTTP local JSON database file bridge. */
        external: ExternalDatabase;
    }
}
