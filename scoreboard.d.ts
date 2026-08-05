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
