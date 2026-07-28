import { world, system } from "@minecraft/server";

/**
 * BASIC READING AND WRITING TO WORLD OR ENTITIES
 */

// Safely stores numbers, booleans, or complex objects to disk
world.database.set("config", { pvp: true, spawn: { x: 0, y: 64, z: 0 } });

// Fast O(1) read from direct in-memory cache
const { pvp, spawn } = world.database.get("config");

/**
 * WORKING WITH DEFAULT FALLBACKS AND CHECKING EXISTENCE
 */

// Check if a database key exists in cache or native dynamic properties
if (!player.database.has("ranks")) {
    player.database.set("ranks", [ "Member" ]);
}

// Equivalent short hand to the above code if !has() then set()
const ranks = player.database.get("ranks", [ "Member" ]);

/**
 * MANIPULATING EXISTING DATABASE OBJECTS
 */

world.afterEvents.entityDie.subscribe(({ deadEntity }) => {
    // {} lets the database know to store an object if undefined
    const stats = deadEntity.database.get("stats", {});

    stats.deaths += 1;
    stats.elo -= 10;

    // Save the database to world to persist our updates
    deadEntity.database.set("stats", stats);
    deadEntity.database.set("pvp", false);
},
{ entityTypes: [ "minecraft:player" ] });

/**
 * OVERSIZED DATA CHUNKING FOR LARGE DATA PAYLOADS
 */

// Automatically partitioned across 'data:0', 'data:1', etc.
const massivePayload = "a".repeat(100000); 
world.database.set("data", massivePayload);       // SUCCESS!
world.setDynamicProperty("data", massivePayload); // ERROR!

// Returns the value from cache, reassembling it sequentially
const retrieved = world.database.get("data");
console.warn(retrieved.length); // 100000

/**
 * DELETING DATA AND CHECKING BYTE SIZE AND KEYS 
 */

// Batch deletes base key + all chunks in 1 native call
world.database.delete("data"); // true, if deleted from DATABASE_CACHE
world.database.delete("data"); // false

console.warn(world.database.keys()); // String array of property IDs
console.warn(world.database.size()); // Total byte count used on target
