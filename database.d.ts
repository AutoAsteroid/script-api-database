import { World, Entity, Player } from "@minecraft/server";

export default class Database {
    /**
     * Target instance supporting native dynamic property methods (world | Entity | Player).
     */
    readonly target: World | Entity | Player;
    /**
     * Unique string identifier for the target instance used for the memory cache bucket.
     * Entity.id string for Entity | Player, and "world" for import("@minecraft/server").world.
     */
    readonly id: string;
    /**
     * Fast O(1) memory cache bucket reference for this database target instance.
     * All parsed data will be saved in memory. The cache does not have an eviction policy.
     */
    readonly cache: Record<string, any>;

    /**
     * A simple cached dynamic property database class wrapper for world and Entity instances.
     * @param target The target instance holding dynamic properties.
     */
    constructor(target: World | Entity | Player);

    /**
     * Fetches the existence of a dynamic property in the dynamic properties of this instance.
     * @param name The dynamic property key name saved to check.
     * @returns Whether or not the database key exists in cache or exists at all.
     */
    has(name: string): boolean;

    /**
     * Gets a saved dynamic property from cache and loads it into cache if it is not cached yet.
     * @template T Optional type hint for the returned data payload.
     * @param name The dynamic property key name saved to get.
     * @param initial Optional value to instantiate the database to if it is undefined.
     * @returns The cached database value or parsed dynamic property value.
     */
    get<T = any>(name: string, initial?: T): T;

    /**
     * Saves a dynamic property to world and saves it into the cache for later direct access.
     * @template T The type of data being saved.
     * @param name The dynamic property key name saved to save.
     * @param data Data to save to world.
     * @returns Returns whatever value was passed into the data parameter directly.
     */
    set<T = any>(name: string, data: T): T;

    /**
     * Deletes a dynamic property key from the Minecraft world and database cache if it exists.
     * @param name The dynamic property key name saved to delete.
     * @returns Whether or not the database dynamic property was deleted from CACHE.
     */
    delete(name: string): boolean;

    /**
     * Returns the available set of dynamic property identifiers that have been used on this instance.
     * @returns A string array of the dynamic properties set on this instance.
     */
    keys(): string[];

    /**
     * Returns the total size, in bytes, of all dynamic properties stored for this instance.
     * @returns Total byte size, including the size of both the key and the value.
     */
    size(): number;
}

declare module "@minecraft/server" {
    interface World {
        /** Memory cached world dynamic property database wrapper. */
        readonly database: Database;
        /** Memory cached world dynamic property database wrapper. */
        readonly db: Database;
    }

    interface Entity {
        /** Memory cached entity dynamic property database wrapper. */
        readonly database: Database;
        /** Memory cached entity dynamic property database wrapper. */
        readonly db: Database;
    }
}
