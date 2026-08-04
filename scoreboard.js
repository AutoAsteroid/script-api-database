import { world } from "@minecraft/server";

// For primitive things like stats, native scoreboards are MUCH better than dynamic property objects

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
 * In memory cache for all get() calls instead of always calling ScoreboardObjective.getScore()
 * There is no eviction policy in place besides when a player leaves the server.
 */
export const SCORES_CACHE = {};

export class WorldScoreboard {
    
}