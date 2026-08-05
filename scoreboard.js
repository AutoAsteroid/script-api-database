import { world } from "@minecraft/server";

/**
 * In memory cache for all get() calls instead of always calling ScoreboardObjective.getScore()
 * There is no cache eviction policy in place besides when a player leaves the server.
 */
export const SCORES_CACHE = {};

export class EntityScoreboard {
    /**
     * A simple cached scoreboard objective score class wrapper for Entity and Player instances.
     * @param {Entity | ScoreboardIdentity} participant Scoreboard participant entry to manage.
     */
    constructor(participant) {
        this.participant = participant;
        this.id = participant.id;

        this.cache = SCORES_CACHE[this.id] ??= {}; // Initialize scoreboard memory cache
    }

    /**
     * Returns the scoreboard value for this Entity scoreboard, or 0 if they don't have a score.
     * @param {string} objective String of the scoreboard objective id, e.g.: "kills", "deaths"
     * @returns {number} Scoreboard score value for the participant of the fetched objective.
     */
    get(objective) {
        try {
            // scoreboard.getScore() can sometimes, rarely throw errors 
            const scoreboard = getObjective(objective);
            return scoreboard.getScore(this.participant) ?? 0;
        } catch {
            return 0;
        }
    }

    /**
     * Creates a dynamic scoreboard proxy object for this participant for heavy scoreboard.get().
     * @returns {Object} Returns a proxy with dynamically fetched get scores. 
     * @example const { money, kills, deaths } = player.scores.fetch();
     */
    fetch() {
        // Implicitly return an object of all scoreboard values if accessed.
        return new Proxy({}, {
            get: (_, objective) => getScore(this.participant, objective)
        });
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
