import { world, system } from "@minecraft/server";

/**
 * You ONLY need to run these imports once in your main ENTRY point file. After which
 * you can seamlessly access the database wrapper in your codebase without reimporting.
 */

import "./path/to/database.js";
import "./path/to/external-db.js";      // Only if you are going to use it
import "./path/to/scoreboard.js";

/**
 * BASIC READING AND WRITING TO WORLD OR ENTITIES
 * Note that you can also use the alias `.db` if you prefer that over writing `database`
 */

// Safely stores numbers, booleans, or complex objects
world.database.set("config", { pvp: true, spawn: { x: 0, y: 64, z: 0 } });

// Fast O(1) read from direct in-memory cache
const { pvp, spawn } = world.database.get("config");

/**
 * WORKING WITH DEFAULT FALLBACKS AND CHECKING EXISTENCE
 * You can omit `initial` in .get() calls if you can guarantee their existence.
 * For example, initializing their values on playerSpawn or worldLoad
 */

// Check if a database key exists in cache or native dynamic properties
if (!player.database.has("ranks")) {
    player.database.set("ranks", [ "Member" ]);
}

// Equivalent short hand to the above code if !has() then set()
const ranks = player.database.get("ranks", [ "Member" ]);

/**
 * MANIPULATING EXISTING DATABASE OBJECTS
 * Ideally, you should keep your complex objects small because every set() must JSON
 * stringify the entire thing. For real use, I would recommend scoreboards for stats.
 */

world.afterEvents.entityDie.subscribe(({ deadEntity }) => {
    // {} lets the database know to store an object if its undefined
    // You can omit it if you know it is guaranteed to be an object
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
 * If your data needs 32767 character chunking, it honestly is too big ESPECIALLY if
 * there are frequent set() calls. While the wrapper handles it fine, performance size,
 * constantly JSON stringifying huge objects for usually small updates is really bad.
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
 * Minecraft starts to send warnings when your dynamic properties are 10MB+ in size
 */

// Batch deletes base key + all chunks in 1 native call
world.database.delete("data"); // true, if deleted from DATABASE_CACHE
world.database.delete("data"); // false, not in DATABASE_CACHE

console.warn(world.database.keys()); // String array of property IDs
console.warn(world.database.size()); // Total byte count used on target

/**
 * EXTERNAL LOCAL JSON FILE DATABASE SAVE, LOAD, AND DELETE USAGE
 * You must import the external-db.js file and run the Go bridge to use these methods.
 * I recommend only storing cold storage or data that MUST be persisted across worlds.
 */

const blacklist = await system.database.load("blacklist");
blacklist[player.name] = { reason: "Cheating", date: Date.now() };

// Save changes to disk to persist changes, should always return true
const saved = await system.database.save("blacklist", blacklist);

// Save to a JSON file subfolder and deleting that subfolder
const stats = { money: 0, kills: 0, deaths: 0 };
await system.database.save(`stats/${player.name}`, stats);
await system.database.delete(`stats/${player.name}`);

/**
 * SCOREBOARD CLASS WRAPPER GENERAL USAGE
 * We don't cache score values because there will be an inconsistency between Minecraft
 * and the score cache if we ever make modifications outside our EntityScoreboard class.
 * Minecraft remains the single source of truth whenever .getScore() is called.
 */

const { money, kills, deaths } = player.scores.fetch();

const newKillCount = player.scores.add("kills", 1);
const playTime = player.scores.get("playTime");

const eventScoreboard = world.objectives.get("events");     // Native ScoreboardObjective
const counter = eventScoreboard.getScore("My Event");

// Global player scoreboard access, enabling even offline player access
const offlinePlayer = world.objectives.identity("PlayerName");
const currentLevel = offlinePlayer.get("level");
const newPower = offlinePlayer.remove("level", 5);
