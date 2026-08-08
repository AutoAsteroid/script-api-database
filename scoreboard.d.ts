import { Entity, ScoreboardIdentity, ScoreboardObjective } from "@minecraft/server";

/**
 * Proxy object for dynamic, lazy property style scoreboard scores access.
 * Maps objective identifiers directly to their current numerical score.
 * 
 * @example
 * const { money, kills, deaths } = player.scores.fetch();
 */
export type DynamicScoreboardFetch = Record<string, number>;

/**
 * Entity scoreboard wrapper class implementation that supports native Entity.scores usage and most
 * importantly, the ability to manage offline player scoreboards with their corresponding username.
 */
export class EntityScoreboard {
    /** Target scoreboard participant instance holding the scoreboard entries */
    readonly participant: Entity | ScoreboardIdentity;
    /** Unique identity ID number for the participant provided by Minecraft */
    readonly id: number;

    /**
     * A simple scoreboard objective class wrapper for Entity and Player scoreboard instances.
     * @param participant Scoreboard participant entry to manage.
     */
    constructor(participant: Entity | ScoreboardIdentity);

    /**
     * Returns the scoreboard value for this Entity scoreboard, or 0 if they don't have a score.
     * @param objective String of the scoreboard objective id, e.g.: "kills", "deaths"
     * @returns Scoreboard score value for the participant of the fetched objective.
     */
    get(objective: string): number;

    /**
     * Creates a dynamic scoreboard proxy object for this participant for heavy scoreboard.get().
     * @returns Returns a proxy with dynamically fetched get scores. 
     * @example const { money, kills, deaths, scoreboardObjectiveId } = player.scores.fetch();
     */
    fetch(): DynamicScoreboardFetch;

    /**
     * Set the score of this participant for the provided scoreboard objective.
     * @param objective String of the scoreboard objective id, e.g.: "kills", "deaths"
     * @param score New score to be set (removes entry if null or undefined).
     */
    set(objective: string, score: number | undefined | null): void;

    /**
     * Adds to the score of this participant for the provided scoreboard objective.
     * @param objective String of the scoreboard objective id, e.g.: "kills", "deaths"
     * @param amount Amount to add to the score, either positive or negative.
     * @returns The new scoreboard value after adding amount to it.
     */
    add(objective: string, amount: number): number;

    /**
     * Removes from the score of this participant for the provided scoreboard objective.
     * @param objective String of the scoreboard objective id, e.g.: "kills", "deaths"
     * @param amount Amount to remove from the score, either positive or negative.
     * @returns The new scoreboard value after removing amount from it.
     */
    remove(objective: string, amount: number): number;

    /**
     * Checks if this participant has an entry in the provided scoreboard objective.
     * @param objective String of the scoreboard objective id, e.g.: "kills", "deaths"
     * @returns Whether or not this participant has an entry in this objective.
     */
    has(objective: string): boolean;

    /**
     * Resets an entry entirely for this participant in the provided scoreboard objective.
     * @param objective String of the scoreboard objective id, e.g.: "kills", "deaths"
     * @returns Whether or not there was a scoreboard entry to delete.
     */
    reset(objective: string): boolean;

    /**
     * Clears this scoreboard identity entirely across from all scoreboard objectives.
     * @returns {number} The number of scoreboard entries this participant removed.
     */
    clear(): number;
}

/**
 * Objective cache is used to cache @minecraft/server.ScoreboardObjective instances in memory.
 * Direct world.scoreboard.getObjective() calls are about 100ms slower for every 10000~ calls. 
 */
export const OBJECTIVE_CACHE: Record<string, ScoreboardObjective>;

/**
 * Returns a scoreboard objective from cache, creating it if it doesn't exist.
 * @param objective String identifier of the scoreboard objective.
 * @param displayName Optional display name of the objective.
 * @returns The fetched cached objective class instance.
 */
export function getObjective(objective: string, displayName?: string | null): ScoreboardObjective;

/**
 * Resets a scoreboard objective by deleting it and recreating an instance of it.
 * @param objective String identifier of the scoreboard objective.
 * @returns The new objective class instance created.
 */
export function resetObjective(objective: string): ScoreboardObjective;

/**
 * Used to cache all ScoreboardIdentity IDs to their ScoreboardIdentity the first time an
 * offline player is fetched. Cache warming on playerSpawn to never need to loop this again. 
 */
export const IDENTITY_CACHE: Record<number, ScoreboardIdentity>;

/**
 * Guarantees the cache is populated and returns it. Runs the O(N) loop at most once per lifecycle.
 * @returns Fully warmed scoreboard identity cache for players.
 */
export function getScoreboardIdentityCache(): Map<number, ScoreboardIdentity>;

/**
 * Returns an object record matching all player ScoreboardIdentity IDs to their player names.
 * @returns Map of { [scoreboardIdentity.id]: "PlayerName" }
 */
export function getScoreboardIdPlayerNameMap(): Record<number, string>;

/**
 * Returns an object record matching all player names to their corresponding ScoreboardIdentity.
 * @returns Map of { ["PlayerName"]: ScoreboardIdentity }
 */
export function getPlayerNameParticipantMap(): Record<string, ScoreboardIdentity>;

/**
 * Gets a scoreboard wrapper instance for the specified username, whether or not they are offline.
 * @param username The username of the player scoreboard to get from.
 * @returns Scoreboard wrapper instance, null if the username is invalid.
 */
export function getPlayerScoreboardIdentity(username: string): EntityScoreboard | null;

/**
 * Interface definition for our import("@minecraft/server").world.objectives property extension.
 * Not to be confused with native world.scoreboard objective functions.
 */
export interface WorldObjectivesExtension {
    /** Gets a cached ScoreboardObjective, creating it if it doesn't exist yet. */
    get: typeof getObjective;

    /** Resets and recreates a ScoreboardObjective. */
    reset: typeof resetObjective;

    /** Gets an EntityScoreboard wrapper for any player by username, even if offline. */
    identity: typeof getPlayerScoreboardIdentity;

    /** Returns a map of all recorded usernames to their ScoreboardIdentity instances. */
    participantMap: typeof getPlayerNameParticipantMap;

    /** Returns a map of scoreboardIdentity.id numbers to player display names. */
    playerNamesMap: typeof getScoreboardIdPlayerNameMap;
}

declare module "@minecraft/server" {
    interface Entity {
        /** Custom EntityScoreboard instance bound lazily to this entity. */
        readonly scores: EntityScoreboard;
    }

    interface World {
        /** Custom cached objective manager and offline player scoreboard lookups. */
        readonly objectives: WorldObjectivesExtension;
    }
}
