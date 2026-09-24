import { world, World, Entity } from "@minecraft/server";

/**
 * This cache will hold our data from our database calls in memory to avoid unneeded reparsing
 * The parent key for the cache are Entity.id strings and "world" for @minecraft/server.world
 * The child keys of those are names of dynamic property keys to their parsed cached values
 */
export const DATABASE_CACHE = {};

export default class Database {
    /**
     * A simple cached dynamic property database class wrapper for World and Entity instances.
     * @param {world | Entity | Player} target The target instance holding dynamic properties.
     */
    constructor(target) {
        this.target = target;
        this.id = target.id ?? "#WORLD";
        this.cache = DATABASE_CACHE[this.id] ??= {}; // Initialize target memory cache
    }

    /**
     * Fetches the existence of a dynamic property in the dynamic properties of this instance. 
     * @param {string} name The dynamic property key name saved to check.
     * @returns {boolean} Whether or not the database key value exists.
     */
    has(name) {
        // Check if the key exists in cache before doing any native calls
        if (name in this.cache) return this.cache[name] !== undefined;

        // Check the base property and partitioned chunk zero for existence
        if (this.target.getDynamicProperty(name) !== undefined) return true;
        return this.target.getDynamicProperty(name + ":0") !== undefined;
    }

    /**
     * Gets a saved dynamic property from cache and loads it into cache if it is not cached yet.
     * @param {string} name The dynamic property key name saved to get.
     * @returns {any} The parsed dynamic property value. Undefined if the key doesn't exist.
     */
    get(name) {
        // Get the parsed property directly from memory if it is already cached
        if (name in this.cache) return this.cache[name];

        // Return the base key if it exists (raw is <= 32767 characters)
        const rawString = this.target.getDynamicProperty(name);
        if (rawString !== undefined) 
            return this.cache[name] = JSON.parse(rawString);
        
        // Partitioned chunk assembly for values that exceed the character limit
        let fullString = "";
        
        for (let i = 0;; i++) {
            const chunk = this.target.getDynamicProperty(name + ":" + i);
            if (chunk === undefined) break;
            else fullString += chunk;
        }
        if (fullString.length)
            return this.cache[name] = JSON.parse(fullString);

        // Fallback and let the cache know that this key does not exist
        return this.cache[name] = undefined;
    }

    /**
     * Saves a dynamic property to world and save it into the cache for later direct access.
     * @param {string} name The dynamic property key name saved to save.
     * @param {any} data Data to save to world.
     * @returns {number} The number of associated dynamic property keys modified.
     */
    set(name, data) {
        // Early delete if data was passed as undefined (returns number deleted keys)
        if (data === undefined || data === null) return this.delete(name);

        const serialized = JSON.stringify(data);
        const updates = {};
        const prefix = name + ":";

        // Delete previous chunks in the case our JSON data decreases chunk size
        for (const key of this.target.getDynamicPropertyIds()) {
            if (key === name || key.startsWith(prefix))
                updates[key] = undefined;
        }

        // Unchunked save for strings under Minecraft's 16 bit 32767 character limit
        if (serialized.length <= 32767) {
            updates[name] = serialized;
        }
        // Partition the database object into chunks if over the string size limit
        else for (let i = 0; i < serialized.length; i += 32767) {
            const key = `${name}:${i / 32767}`;
            updates[key] = serialized.slice(i, i + 32767);
        }
        
        // Single native call into Bedrock C++ engine updating all related keys
        this.target.setDynamicProperties(updates);

        return Object.keys(updates).length;
    }

    /**
     * Deletes a dynamic property key from the Minecraft world and database cache if it exists.
     * @param {string} name The dynamic property key name saved to delete.
     * @returns {number} Number of associated dynamic property keys that were deleted.
     */
    delete(name) {
        const updates = {};
        const prefix = name + ":";
        let deleteCount = 0;

        // Deletes any base keys or partitioned string chunks if they exist
        for (const key of this.target.getDynamicPropertyIds()) {
            if (key === name || key.startsWith(prefix)) {
                updates[key] = undefined;
                deleteCount += 1;
            }
        }
        // Early return if we couldn't find any keys that matched name
        if (deleteCount === 0) return 0;

        // Single native call into Bedrock C++ engine updating all related keys
        this.target.setDynamicProperties(updates);
        delete this.cache[name];

        return deleteCount;
    }

    /**
     * Returns the available set of dynamic property identifiers that have been used on this.
     * @returns {array<string>} A string array of the dynamic properties set on this instance.
     */
    keys() {
        const logicalKeys = new Set();

        // Strip all trailing chunk suffixes from large data like ":0", ":1"
        for (const key of this.target.getDynamicPropertyIds())
            logicalKeys.add(key.replace(/:\d+$/, ""));

        return Array.from(logicalKeys);
    }

    /**
     * Returns the total size, in bytes, of all dynamic properties stored for this instance.
     * @returns {number} Total byte size, including the size of both the key and the value.
     */
    size() {
        return this.target.getDynamicPropertyTotalByteCount();
    }
}

/**
 * Attach database getters to Entity and World prototypes for seamless usage across the codebase.
 * Player extends Entity, so Player automatically get access to `.database` and `.db` too.
 */
const DATABASE_KEY = Symbol("DatabaseInstance");

for (const Prototype of [ Entity.prototype, World.prototype ]) {    
    // Define the 'database' property getter on Bedrock's native Entity or World prototype
    Object.defineProperty(Prototype, "database", {
        get() {
            return this[DATABASE_KEY] ??= new Database(this);
        },
        configurable: false,
        enumerable: false
    });

    // Database alias so accessing world/entity.db just reads database property directly
    Object.defineProperty(Prototype, "db", {
        get() { 
            return this.database;
        },
        configurable: true,
        enumerable: false
    });
}

/**
 * This allows native database usage across entities, players, and the world:
 * 
 * - world.database.get("key", value)
 * - entity.database.set("key", value)
 * - player.database.has("key")
 * - player.database.delete("key")
 * 
 * Player extends Entity in native @minecraft/server, so players automatically inherit this.
 */

// Eviction policy for cache when entities are removed from the server to not leak memory
world.afterEvents.playerLeave.subscribe(({ playerId }) => {
    delete DATABASE_CACHE[playerId];
});

world.afterEvents.entityRemove.subscribe(({ removedEntityId }) => {
    delete DATABASE_CACHE[removedEntityId];
});
