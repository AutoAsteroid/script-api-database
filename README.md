# 💾 Script API Database

A high-performance, light-memory dynamic property database and scoreboard wrapper for Minecraft Bedrock's Script API (`@minecraft/server`). Built with zero-copy payload chunking, self-overwriting lazy getters, offline scoreboard cross-mapping, and automated JSON serialization. Packed with an additional external local JSON file database written in Go using `@minecraft/server-net`.

---

## ⚙️ Features

| Feature | Description |
| --- | --- |
| **Unlimited Payload Size** | Automatically partitions oversized data across sequential chunk keys (`key:0`, `key:1`), bypassing Bedrock's strict 32,767 character string dynamic property limit. |
| **Memory Caching** | Stores parsed database values and scoreboard objectives in cached memory (`DATABASE_CACHE` & `OBJECTIVE_CACHE`) for $O(1)$ access speed. |
| **JSON Serialization** | Native stringify/parse handling that safely supports complex objects, arrays, numbers, floats, booleans, and values like `null`. |
| **Offline Player Scoreboards** | Implements a relational identity bridge (`#USERNAMES_MAP` & `#SCOREBOARD_ID`) to get and modify player scoreboards by username, even if they are offline. |
| **Seamless Prototype Binding** | Uses self-overwriting prototype accessors (`world.database`, `entity.database`, `entity.scores`) to attach directly to class instances on first access. |
| **External JSON Files** | Allows storing data outside the Bedrock Scripting API environment in local JSON files for cold or persistent storage via Go. |

## 📦 Installation & Usage

### 1. Script Dynamic Properties & Scoreboards

Download `database.js` and `scoreboard.js` into your behavior pack `scripts/` folder. Import them from your main entry point (`main.js`). This automatically decorates all `world` and `Entity` instances with seamless access.

```javascript
import "./path/to/database.js";
import "./path/to/scoreboard.js";
```

### 2. External Local JSON Files

If you would like access to cold or persistent storage saved outside the Script API environment, you must build and run the high performance Go bridge. You should use `systemd` or equivalent methods to keep this program running.

```bash
go build -o external-db main.go
```

After running the binary, paste the `external-db.js` file in your behavior pack `scripts/` and import it in your main entry file. You will then be able to access the external database with `system.database` calls.

```javascript
import "./path/to/external-db.js";
```

---

## 📖 API Reference

### Dynamic Properties (`world.database` / `entity.database`)
* **`.get(name, initial = {})`** : `any` — Reads a dynamic property from cache or reassembles it.
* **`.set(name, data)`** : `any` — Serializes data to JSON and saves it (auto-chunks if >32,767 chars).
* **`.has(name)`** : `boolean` — Checks if key exists in memory cache or native dynamic properties.
* **`.delete(name)`** : `boolean` — Removes key and all associated chunk partitions from storage and cache.
* **`.keys()`** : `string[]` — Returns an array of all dynamic property keys stored on the target.
* **`.size()`** : `number` — Returns total byte footprint of all properties on the target.

### External Local Storage (`system.database`)
* **`await .load(file)`** : `Promise<any>` — Reads data from a JSON file via the Go bridge.
* **`await .save(file, data)`** : `Promise<boolean>` — Writes data to a JSON file via the Go bridge.
* **`await .delete(file)`** : `Promise<boolean>` — Deletes a JSON file via the Go bridge.

### Entity Scoreboards (`Entity.scores`)
* **`.get(objective)`** : `number` — Gets the score value for target objective (defaults to `0` if unset).
* **`.has(objective)`** : `boolean` — Checks if the player has an entry in this scoreboard objective.
* **`.set(objective, score)`** : `void` — Sets a score value, removing it if `null` or `undefined`.
* **`.add(objective, amount)`** : `number` — Increments target score by amount and returns updated total.
* **`.remove(objective, amount)`** : `number` — Decrements target score by amount and returns updated total.
* **`.reset(objective)`** : `boolean` — Resets the target entry from this scoreboard objective.
* **`.fetch()`** : `Proxy` — Returns a dynamic JS Proxy for reading scores directly as object properties.
* **`.clear()`** : `number` — Removes this scoreboard identity from all scoreboard objectives.

### Objective Utilities (`world.objectives`)
* **`.get(objective, displayName?)`** : `ScoreboardObjective` — Returns a cached native objective.
* **`.reset(objective)`** : `ScoreboardObjective` — Clears all objective entries by deleting and recreating it.
* **`.identity(username)`** : `EntityScoreboard | null` — Resolves any player scoreboard by username.
* **`.participantMap()`** : `Record<string, ScoreboardIdentity>` — Map of player names to participants.
* **`.playerNamesMap()`** : `Record<number, string>` — Map of `scoreboardIdentity.id` to player names.

### 💡Example Usage: [examples.js](./examples.js)

---

## License

This project is licensed under the MIT License. See the [LICENSE](./LICENSE) file for details.
