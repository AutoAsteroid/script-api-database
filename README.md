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

## 💡Example Usage

### 1. Basic Reading & Writing

```javascript
// Safely stores numbers, booleans, or complex objects to disk
world.database.set("config", { pvp: true, spawn: { x: 0, y: 64, z: 0 } });

// Fast O(1) read from direct in-memory cache
const { pvp, spawn } = world.database.get("config");
```

### 2. Working with Default Fallbacks & Checking Existence

```javascript
// Check if a database key exists in cache or native dynamic properties
if (!player.database.has("ranks")) {
    player.database.set("ranks", [ "Member" ]);
}

// Equivalent short hand to the above code if !has() then set()
const ranks = player.database.get("ranks", [ "Member" ]);
```

### 3. Manipulating Existing Database Objects

```javascript
world.afterEvents.entityDie.subscribe(({ deadEntity }) => {
    // {} lets the database know to store an object if undefined
    const stats = deadEntity.database.get("stats", {));

    stats.deaths += 1;
    stats.elo -= 10;

    // Save the database to world to persist our updates
    deadEntity.database.set("stats", stats);
    deadEntity.database.set("pvp", false);
},
{ entityTypes: [ "minecraft:player" ] });
```

### 4. Oversized Data Chunking

```javascript
// Automatically partitioned across 'data:0', 'data:1', etc.
const massivePayload = "Hello world!".repeat(100000); 
world.database.set("data", massivePayload);
world.setDynamicProperty("data", massivePayload); // ERROR!

// Returns the value from cache, reassembling it sequentially
const retrieved = world.database.get("data");
console.warn(retrieved.length); // 100000
```

### 5. Deleting Data & Checking Byte Size

```javascript
// Batch deletes base key + all chunks in 1 native call
world.database.delete("data"); // true, if deleted from DATABASE_CACHE
world.database.delete("data"); // false

console.warn(world.database.keys()); // Returns string array of property IDs
console.warn(world.database.size()); // Returns total byte count used on target
```

---

## License

This project is licensed under the MIT License. See the [LICENSE](https://www.google.com/search?q=LICENSE) file for details.
