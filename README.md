# 💾 Script API Database

A high-performance, light-memory database wrapper for Minecraft Bedrock's Script API (`@minecraft/server`). Built with zero-copy payload chunking, self-overwriting lazy getters, and automated JSON serialization.  Packed with an additional external local JSON file database written in go using `@minecraft/server-net`.

---

## ⚙️ Features

| Feature | How It Works | Technical Advantage |
| :--- | :--- | :--- |
| **Unlimited Payload Size** | Automatically partitions oversized data across sequential chunk keys (`key:0`, `key:1`, etc.). | Bypasses Bedrock's strict 32,767 character property limit without manual string management. |
| **Memory Caching** | Stores parsed values in an in-memory session cache (`DATABASE_CACHE`) on first appearance. | $O(1)$ read performance after initial load, preventing repeated, expensive native JSON parsing. |
| **JSON Serialization** | Passes all data types through `JSON.stringify()` and `JSON.parse()`. | Safely handles complex objects, arrays, numbers, floats, booleans, and `null` without type checks. |
| **Seamless Entity & World Binding** | Uses self-overwriting prototype accessors (`entity.database` or `entity.db`) once on first call. | Integrates directly with `world.database` and `entity.database` without reimporting the database file. |

---

## 📦 Installation & Usage

Download the `database.js` file and paste it anywhere in your behavior pack `scripts/`. Import the database module from your entry point (`main.js`) file. This automatically decorates all `world` and `Entity` instances with seamless `.database` and `.db` database access.

```javascript
import "./path/to/database.js"; // Registers lazy getters for world and entities
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

---

## License

This project is licensed under the MIT License. See the [LICENSE](https://www.google.com/search?q=LICENSE) file for details.
