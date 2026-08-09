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
     * @returns {boolean} Whether or not the database key exists in cache or exists at all.
     */
    has(name) {
        // O(1) check if the dynamic property name already exists in cache
        if (name in this.cache) return this.cache[name] !== undefined;

        // Check the base property and partitioned chunk zero for existence
        if (this.target.getDynamicProperty(name) !== undefined) return true;
        return this.target.getDynamicProperty(name + ":0") !== undefined;
    }

    /**
     * Gets a saved dynamic property from cache and loads it into cache if it is not cached yet.
     * @param {string} name The dynamic property key name saved to get.
     * @param {any} [initial={}] Optional value to instantiate the database to if its undefined.
     * @returns {any} The cached database value or parsed dynamic property value.
     */
    get(name, initial = {}) {
        // Get the parsed property directly from memory if it is already cached
        if (this.cache[name] !== undefined) return this.cache[name];

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

        // Fallback to initial if the dynamic property does not exist anywhere
        return this.cache[name] = initial;
    }

    /**
     * Saves a dynamic property to world and save it into the cache for later direct access.
     * @param {string} name The dynamic property key name saved to save.
     * @param {object|array|string|number|boolean|undefined} data Data to save to world.
     * @returns {any} Returns whatever value was passed into the data parameter directly.
     */
    set(name, data) {
        // Early delete instead if data was passed as undefined or null (returns bool)
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
        
        // Single native call into Bedrock C++ engine
        this.target.setDynamicProperties(updates);
        return this.cache[name] = data;
    }

    /**
     * Deletes a dynamic property key from the Minecraft world and database cache if it exists.
     * @param {string} name The dynamic property key name saved to delete.
     * @returns {boolean} Whether or not the database dynamic property existed to delete.
     */
    delete(name) {
        const updates = {};
        const prefix = name + ":";
        let existed = false;

        // Deletes any base keys or partitioned string chunks if they exist
        for (const key of this.target.getDynamicPropertyIds()) {
            if (key === name || key.startsWith(prefix)) {
                updates[key] = undefined;
                existed = true;
            }
        }
        // Early return if we couldn't find any keys that matched name
        if (existed === false) return false;

        this.target.setDynamicProperties(updates);
        delete this.cache[name];
        return true;
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
 * Attach a self-overwriting lazy getter to Entity and World prototypes for seamless usage:
 */

for (const Prototype of [ Entity.prototype, World.prototype ]) {
    /**
     * Laxy initialization and instance overwrite (Runs ONLY ONCE per object instance)
     * First access instantiates the Database that is reused for all future access.
     */
    Object.defineProperty(Prototype, "database", {
        get() {
            const database = new Database(this);

            // Overwrite "database" on THIS INSTANCE with the static class instance
            Object.defineProperty(this, "database", {
                value: database,
                writable: false,
                enumerable: false,
                configurable: false
            });

            return database;
        },
        // Allows the prototype getter to be overwritten by the instance above
        configurable: true,
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
    delete DATABASE_CACHE[playerId]
});

world.afterEvents.entityRemove.subscribe(({ removedEntityId }) => {
    delete DATABASE_CACHE[removedEntityId]
});
