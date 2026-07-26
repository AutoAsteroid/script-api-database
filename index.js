import { world, system, Entity } from "@minecraft/server";

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
        this.id = target.id ?? "world";

        DATABASE_CACHE[this.id] ??= {}; // Initialize target partition memory cache
    }

    /**
     * Fetches the existence of a dynamic property in the dynamic properties of this instance. 
     * @param {string} name The dynamic property key name saved to check.
     * @returns {boolean} Whether or not the database key exists in cache or exists at all.
     */
    has(name) {
        // O(1) check if the dynamic property name already exists in cache
        if (name in DATABASE_CACHE[this.id])
            return DATABASE_CACHE[this.id][name] !== undefined;

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
        const cached = DATABASE_CACHE[this.id][name];
        if (cached !== undefined) return cached;

        const raw = this.target.getDynamicProperty(name);
        if (raw === undefined)
            return DATABASE_CACHE[this.id][name] = initial;

        const data = typeof raw === "string" ? JSON.parse(raw) : raw;
        return DATABASE_CACHE[this.id][name] = data;
    }

    /**
     * Saves a dynamic property to world and save it into the cache for later direct access.
     * @param {string} name The dynamic property key name saved to save.
     * @param {object|array|string|number|boolean|undefined} data Data to save to world.
     * @returns {any} Returns whatever value was passed into the data parameter directly
     */
    set(name, data) {
        const isObject = typeof data === "object" && data !== null;
        const serialized = isObject ? JSON.stringify(data) : data;

        // Native type save for non strings OR strings under the character limit
        if (typeof serialized !== "string" || serialized.length <= 32767) {
            this.target.setDynamicProperty(name, serialized);
        } 
        // Partition the database object into chunks if over the string size limit
        else for (let i = 0; i < serialized.length; i += 32767) {
            const key = `${name}:${i / 32767}`;
            const chunk = serialized.slice(i, i + 32767);
            this.target.setDynamicProperty(key, chunk);
        }
        return DATABASE_CACHE[this.targetId][name] = data;
    }

    /**
     * Deletes a dynamic property key from the Minecraft world and database cache if it exists.
     * @returns {boolean} Whether or not the database dynamic property was deleted from CACHE.
     */
    delete(name) {
        const updates = { [name]: undefined };
        const prefix = `${name}:`;

        // Deletes any partitioned string chunks if they exist
        for (const key of this.target.getDynamicPropertyIds()) 
            if (key.startsWith(prefix))
                updates[key] = undefined;

        this.target.setDynamicProperties(updates);
        return delete DATABASE_CACHE[this.id][name];
    }

    /**
     * Returns the available set of dynamic property identifiers that have been used on this.
     * @returns {array<string>} A string array of the dynamic properties set on this instance.
     */
    keys() {
        return this.target.getDynamicPropertyIds();
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
 * Attach a self-overwriting lazy getter to Entity and World prototypes for seemless usage:
 */

for (const Prototype of [ Entity.prototype, World.prototype ]) {
    /**
     * LAZY INITIALIZATION & INSTANCE OVERWRITE (Runs ONLY ONCE per object instance):
     * 
     * 1. First Access (Getter Triggered):
     *      When `target.database` is called for the very first time, the prototype getter fires,
     *      instantiates new Database(this), and binds it to the specific instance (`this`).
     * 
     * 2. Self-Overwriting Property:
     *      Object.defineProperty(this, "database", ...) defines a flat `value` property 
     *      directly on the individual instance (`this`), masking this prototype getter.
     * 
     * 3. Subsequent Accesses (Zero Overhead):
     *      All future calls to `target.database` bypass this getter completely and read 
     *      the stored `Database` instance directly from memory as a plain property lookup.
     */
    Object.defineProperty(Prototype, "database", {
        get() {
            const database = new Database(this);

            // Overwrite "database" on THIS INSTANCE with the static class instance
            Object.defineProperty(this, "database", {
                value: database,
                writable: false,
                configurable: true
            });

            return database;
        },
        // Allows the prototype getter to be overwritten by the instance above
        configurable: true
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
