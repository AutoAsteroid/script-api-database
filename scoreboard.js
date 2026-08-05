import { world, Entity, ScoreboardIdentity, ScoreboardObjective } from "@minecraft/server";

/**
 * Entity scoreboard wrapper class implementation that supports native Entity.scores usage and most
 * importantly, the ability to manage offline player scoreboards with their corresponding username.
 * 
 * For example, player.scores and world.objectives.identity(username) return the same thing.
 */

export class EntityScoreboard {
    /**
     * A simple scoreboard objective class wrapper for Entity and Player scoreboard instances.
     * @param {Entity | ScoreboardIdentity} participant Scoreboard participant entry to manage.
     */
    constructor(participant) {
        this.participant = participant;
        this.id = participant.id;
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
     * @example const { money, kills, deaths, scoreboardObjectiveId } = player.scores.fetch();
     */
    fetch() {
        // Implicitly return an object of all scoreboard values if accessed directly
        return new Proxy({}, { get: (_, objective) => this.get(objective) });
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
        if (score !== 0 && !score)
            scoreboard.removeParticipant(this.participant);
        else scoreboard.setScore(this.participant, Math.round(score));
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
        return getObjective(objective).addScore(this.participant, Math.round(amount));
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
        return getObjective(objective).removeParticipant(this.participant);
    }

    /**
     * Clears this scoreboard identity entirely across from all scoreboard objectives.
     * @returns {number} The number of scoreboard entries this participant removed.
     */
    clear() {
        let reseted = 0;
        // JavaScript += will convert removeParticipant's boolean to a 1 or 0 on removal
        for (const objective of world.scoreboard.getObjectives()) {
            reseted += objective.removeParticipant(this.participant);
        }
        return reseted;
    }
}

/**
 * Attach a self-overwriting lazy getter to Entity prototypes for seamless usage using lazy 
 * initialization to run only once per object instance. Similar to what database.js does.
 */
Object.defineProperty(Entity.prototype, "scores", {
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

    // Cache a valid reference or create it if the objective does not exist
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

/**
 * This clever cross mapping implementation makes it possible to access offline player scoreboards
 * based off their username. ScoreboardIdentity always lives in the server, however accessing
 * the correct corresponding participant identity of an offline player is a bit tricky.
 */

world.afterEvents.playerSpawn.subscribe(({ player, initialSpawn }) => {
    if (!initialSpawn) return;
    // Maps dummy names to the player.scoreboardIdentity.id
    const usernamesMap = getObjective("#USERNAMES_MAP");

    // Maps actual player scoreboardIdentities to their id
    const scoreboardID = getObjective("#SCOREBOARD_ID");

    // scoreboardIdentity will be undefined if the player does not have any scoreboard entries
    scoreboardID.addScore(player, 0);   // Ensure the player has at least one entry
    scoreboardID.setScore(player, player.scoreboardIdentity.id);

    // Make sure there is only one dummy scoreboard with the same scoreboardIdentity.id score
    usernamesMap.getScores()
        .filter(({ score }) => score === player.scoreboardIdentity.id)
        .forEach(({ participant }) => usernamesMap.removeParticipant(participant));

    usernamesMap.setScore(player.name, player.scoreboardIdentity.id);
});

/**
 * Every ScoreboardIdentity has an ID that increments by 1 for every unique scoreboard identity. 
 * We map this ID to a dummy scoreboard with the ID as the score and display name as the player.
 * Then we store another scoreboard attached directly to the player identity with the matching ID.
 * We use the ID to cross map the dummy scoreboard ID to the ID of the actual identity.
 */

/**
 * Returns an object record matching all player ScoreboardIdentity IDs to their player names.
 * @returns {Object<number, string>} For example: { scoreboardIdentity.id: "AutoAsteroid" }
 */
export function getScoreboardIdPlayerNameMap() {
    // The score value in usernamesMap is actually the scoreboardIdentity.id
    const usernamesMap = getObjective("#USERNAMES_MAP");
    const scoreboardIdPlayerNameMap = usernamesMap
        .getScores()
        .map(({ score, participant }) => [ score, participant.displayName ]);
    
    // { scoreboardIdentity.id: "AutoAsteroid" }
    return Object.fromEntries(scoreboardIdPlayerNameMap);
}

/**
 * Returns an object record matching all player names to their corresponding ScoreboardIdentity.
 * @returns {Object<string, ScoreboardIdentity>} For example: { "AutoAsteroid": participant }
 */
export function getPlayerNameParticipantMap() {
    const playerNameMap = getScoreboardIdPlayerNameMap();
    // { scoreboardIdentity.id: "AutoAsteroid" }
    
    const scoreboardID = getObjective("#SCOREBOARD_ID");
    const participantMap = scoreboardID
        .getParticipants()
        .map(scoreboard => [ playerNameMap[scoreboard.id], scoreboard ]);

    // { "AutoAsteroid": scoreboardIdentity }
    return Object.fromEntries(participantMap);
}

/**
 * Gets a scoreboard wrapper instance for the specified username, whether or not they are offline.
 * @param {string} username The username of the player scoreboard to get from.
 * @returns {EntityScoreboard|null} Scoreboard wrapper instance, null if the username is invalid.
 */
export function getPlayerScoreboardIdentity(username) {
    // Direct call to get the matching scoreboard identity ID for this username
    const usernamesMap = getObjective("#USERNAMES_MAP");
    const identityID = usernamesMap.getScore(username); 
    
    // There is no native method to get ScoreboardIdentity from ID so we must do a linear search
    const scoreboardID = getObjective("#SCOREBOARD_ID");
    const participants = scoreboardID.getParticipants();
    const participant = participants.find(({ id }) => id === identityID);

    if (participant === undefined) return null;
    else return new EntityScoreboard(participant);
}

/**
 * Attach objective helper function access to world.objectives to use anywhere.
 * Not to be confused with native world.scoreboard objective functions.
 */
world.objectives = {
    get: getObjective, reset: resetObjective,
    
    // Enables getting EntityScoreboard of any player, even if offline
    identity: getPlayerScoreboardIdentity,

    // Mapping functions to access even all offline player identities
    participantMap: getPlayerNameParticipantMap,
    playerNamesMap: getScoreboardIdPlayerNameMap
};
