# 💾 Script API Database

A high-performance, light-memory database and scoreboard wrapper for Minecraft Bedrock's Script API (`@minecraft/server`). Built with zero-copy payload chunking, self-overwriting lazy getters, offline scoreboard cross-mapping, and automated JSON serialization. Packed with an additional external local JSON file database written in Go using `@minecraft/server-net`.

---

## ⚙️ Features

* **Unlimited Payload Size** — Automatically partitions oversized data across sequential chunk keys (`key:0`, `key:1`), bypassing Bedrock's strict 32,767 character property limit.
* **Memory Caching** — Stores parsed database values and scoreboard objectives in cached memory for $O(1)$ read performance.
* **JSON Serialization** — Native stringify/parse handling that safely supports complex objects, arrays, numbers, booleans, and values like `null`.
* **Offline Player Scoreboards** — Implements a relational identity bridge (`#USERNAMES_MAP` & `#SCOREBOARD_ID`) to get and modify player scoreboards by username, even if they are offline.
* **Seamless Prototype Binding** — Uses self-overwriting prototype accessors (`world.database`, `entity.database`, `entity.scores`) to attach directly to game objects on first access.
* **External JSON Files** — Allows storing data outside the Bedrock Scripting API environment in local JSON files for cold or persistent storage via Go.

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

### `database.get(name, [initial = {}])`

Gets a property from cache. If uncached, reads and reassembles dynamic property chunks from Bedrock storage.

* **`name`** `(string)`: Key name.
* **`initial`** `(any, optional)`: Default fallback value if key doesn't exist.
* **Returns:** `any`

### `database.set(name, data)`

Serializes data to JSON and saves it. Automatically partitions data into chunks if over 32,767 characters.

* **`name`** `(string)`: Key name.
* **`data`** `(any)`: Data to store.
* **Returns:** `any`

### `database.has(name)`

Checks if a key exists in memory cache or in Bedrock's native dynamic properties.

* **`name`** `(string)`: Key name.
* **Returns:** `boolean`

### `database.delete(name)`

Deletes the key and all chunk partitions from native dynamic properties in a single batch call, then evicts it from memory cache.

* **`name`** `(string)`: Key name.
* **Returns:** `boolean`

### `database.keys()`

Returns all dynamic property identifier keys stored on the target.

* **Returns:** `Array<string>`

### `database.size()`

Returns the total byte size used by all dynamic properties on the target.

* **Returns:** `number`

### `await system.database.load(file)`

Reads from a JSON file stored in the external local JSON data folder.

* **`file`** `(string)`: The file identifier path.
* **Returns:** `any`

### `await system.database.save(file, data)`

Writes to a JSON file stored in the external local JSON data folder.

* **`file`** `(string)`: The file identifier path.
* **`data`** `(any)`: Data to store.
* **Returns:** `boolean`

### `await system.database.delete(file)`

Deletes a JSON file stored in the external local JSON data folder.

* **`file`** `(string)`: The file identifier path.
* **Returns:** `boolean`

### 💡Example Usage: [examples.js](./examples.js)

---

## License

This project is licensed under the MIT License. See the [LICENSE](./LICENSE) file for details.
