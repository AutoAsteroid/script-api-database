import { world, system, Entity } from "@minecraft/server";

/**
 * This cache will hold our database calls into memory to avoid unneeded reparsing
 * The parent key is Entity.id strings and "world" for world
 * The child keys are names of dynamic properties to their parsed values
 */
export const DATABASE_CACHE = {};

/**
 * 
 *  @example
 *  
 *  // Primitive numbers and booleans are saved natively with no JSON.stringify
 *  player.database.set("coins", 500); 
 *  const coins = player.database.get("coins"); // returns 500 (number)
 * 
 *  // Objects & Arrays are JSON serialized
 *  world.database.set("settings", { spawn: { x: 0, y: 0, z: 0 }, cheats: false });
 *  const { spawn, cheats } = world.database.get("settings");
 * 
 */

export default class Database {
    /**
     * 
     * @param {world | Entity | Player} target 
     */
    constructor(target) {
        this.target = target;
        this.id = target.id ?? "world";

        DATABASE_CACHE[this.id] ??= {};
    }

    has(name) {
        if (name in DATABASE_CACHE[this.id]) return true;
        return this.get(name) !== undefined;
    }

    get(name, initial = {}) {
        const cached = DATABASE_CACHE[this.id][name];
        if (cached !== undefined) return cached;

        const raw = this.target.getDynamicProperty(name);
        if (raw === undefined)
            return DATABASE_CACHE[this.id][name] = initial;

        const data = typeof raw === "string" ? JSON.parse(raw) : raw;
        return DATABASE_CACHE[this.id][name] = data;
    }

    set(name, data) {
        const isObject = typeof data === "object" && data !== null;
        const valueToSave = isObject ? JSON.stringify(data) : data;

        this.target.setDynamicProperty(name, valueToSave);
        return DATABASE_CACHE[this.targetId][name] = data;
    }

    delete() {
        this.target.setDynamicProperty(name, undefined);
        return delete DATABASE_CACHE[this.id][name];
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
