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
        // Return the cached scoreboard objective value if accessed in the past
        if (objective in this.cache) return this.cache[objective];

        try {
            // scoreboard.getScore() can sometimes, rarely throw errors 
            const scoreboard = getObjective(objective);
            const score = scoreboard.getScore(this.participant) ?? 0;
            return this.cache[objective] = score;
        } catch {
            return this.cache[objective] = 0;
        }
    }

    /**
     * Creates a dynamic scoreboard proxy object for this participant for heavy scoreboard.get().
     * @returns {Object} Returns a proxy with dynamically fetched get scores. 
     * @example const { money, kills, deaths, scoreboardObjectiveId } = player.scores.fetch();
     */
    fetch() {
        // Implicitly return an object of all scoreboard values if accessed directly
        return new Proxy({}, { get: (_, objective) => getScore(objective) });
    }

    /**
     * Set the score of this participant for the provided scoreboard objective.
     * @param {string} objective String of the scoreboard objective id, e.g.: "kills", "deaths"
     * @param {number | undefined | null} score New score to be set to the participant score.
     * @returns {void}
     */
    set(objective, score) {
        const scoreboard = getObjective(objective);

        // Remove the scoreboard participant if the new value is nothing
        if (score !== 0 && !score) {
            scoreboard.removeParticipant(this.participant);
            delete this.cache[objective];
        } else {
            const rounded = Math.round(score);
            scoreboard.setScore(this.participant, rounded);
            this.cache[objective] = rounded;
        }
    }

    /**
     * Adds to the score of this participant for the provided scoreboard objective.
     * @param {string} objective String of the scoreboard objective id, e.g.: "kills", "deaths"
     * @param {number} amount Amount to add to the score, either positive or negative.
     * @returns {number} The new scoreboard value after adding amount to it.
     */
    add(objective, amount) {
        // Return 0 and do nothing if the passed amount is not a number
        if (isNaN(amount)) return 0;
    
        // Round the scoreboard value before adding to the objective
        const scoreboard = getObjective(objective);
        const newScore = scoreboard.addScore(this.participant, Math.round(amount));
        return this.cache[objective] = newScore;
    }

    /**
     * Removes from the score of this participant for the provided scoreboard objective.
     * @param {string} objective String of the scoreboard objective id, e.g.: "kills", "deaths"
     * @param {number} amount Amount to remove from the score, either positive or negative.
     * @returns {number} The new scoreboard value after removing amount from it.
     */
    remove(objective, amount) {
        return this.add(objective, -amount);
    }

    /**
     * Checks if this participant has an entry in the provided scoreboard objective.
     * @param {string} objective String of the scoreboard objective id, e.g.: "kills", "deaths"
     * @returns {boolean} Whether or not this participant has an entry in this objective.
     */
    has(objective) {
        return getObjective(objective).hasParticipant(this.participant);
    }

    /**
     * Resets an entry entirely for this participant in the provided scoreboard objective.
     * @param {string} objective String of the scoreboard objective id, e.g.: "kills", "deaths"
     * @returns {boolean} Whether or not there was a scoreboard entry to delete.
     */
    reset(objective) {
        delete this.cache[objective];
        return getObjective(objective).removeParticipant(this.participant);
    }

    /**
     * Clears this scoreboard identity entirely across from all scoreboard objectives.
     * @returns {number} The number of scoreboard entries this participant had to remove.
     */
    clear() {
        let reseted = 0;
        // JavaScript += will convert removeParticipant's boolean to a 1 or 0 on removal
        for (const objective of world.scoreboard.getObjectives()) {
            reseted += objective.removeParticipant(this.participant);
            delete this.cache[objective.id];
        }
        return reseted;
    }
}

/**
 * Attach a self-overwriting lazy getter to Entity prototypes for seamless usage using lazy 
 * initialization to run only once per object instance. Similar to what database.js does.
 */
Object.defineProperty(Entity, "scores", {
    get() {
        const scoreboard = new EntityScoreboard(this);

        // Overwrite "scores" on THIS INSTANCE with the static class instance
        Object.defineProperty(this, "scores", {
            value: scoreboard,
            writable: false,
            configurable: true
        });

        return scoreboard;
    },
    // Allows the prototype getter to be overwritten by the instance above
    configurable: true
});

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
