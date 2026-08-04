import { world } from "@minecraft/server";

// For primitive things like stats, native scoreboards are MUCH better than dynamic property objects

/**
 * In memory cache for all get() calls instead of always calling ScoreboardObjective.getScore()
 * There is no eviction policy in place besides when a player leaves the server.
 */
export const SCORES_CACHE = {};

export class EntityScoreboard {
    constructor() {

    }

    get() {

    }

    set() {

    }

    add() {

    }

    remove() {

    }

    reset() {

    }
}

/**
 * Objective cache is used to cache @minecraft/server.ScoreboardObjective instances in memory.
 * Direct world.scoreboard.getObjective() calls are about 100ms slower for every 10000~ calls. 
 */
export const OBJECTIVE_CACHE = {};

/**
 * Returns a scoreboard objective from cache, creating it if it doesn't exist.
 * @param {string} objective String identifier of the scoreboard objective.
 * @param {string} [displayName=null] Optional display name of the objective.
 * @returns {ScoreboardObjective} The fetched cached objective class instance.
 */
export function getObjective(objective, displayName = null) {
    // Return the objective if a valid reference currently exists in cache
    const cachedObjective = OBJECTIVE_CACHE[objective];
    if (cachedObjective && cachedObjective.isValid) return cachedObjective;

    // Cache a valid reference or create it if the objective does nto exist
    const scoreboard = 
        world.scoreboard.getObjective(objective) ?? 
        world.scoreboard.addObjective(objective, displayName);

    return OBJECTIVE_CACHE[objective] = scoreboard;
}

/**
 * Resets a scoreboard objective by deleting it and recreating an instance of it.
 * @param {string} objective String identifier of the scoreboard objective.
 * @returns {ScoreboardObjective} The new objective class instance created.
 */
export function resetObjective(objective) {
    const existing = world.scoreboard.getObjective(objective);
    const display = existing ? existing.displayName : null;

    // Delete the existing scoreboard objective if it exists and recreate it
    if (existing) world.scoreboard.removeObjective(objective);
    return world.scoreboard.addObjective(objective, display);
}

// Attach objective helper function access to world.objective to use anywhere
world.objective = { get: getObjective, reset: resetObjective };
