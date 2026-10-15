# anki-apkg-parser

[![npm version](https://img.shields.io/npm/v/anki-apkg-parser.svg)](https://www.npmjs.com/package/anki-apkg-parser)
[![node](https://img.shields.io/node/v/anki-apkg-parser.svg)](https://nodejs.org)

Read Anki deck files (`.apkg`, `.colpkg`) in Node.js: unpack the archive, then get notes, cards, note types and media.

- Supports all deck formats: legacy `collection.anki2` / `collection.anki21` and the current `collection.anki21b`.
- Full SQL access to the deck database through the built-in [`node:sqlite`](https://nodejs.org/api/sqlite.html).
- No native modules, nothing is compiled on install. Three small dependencies.
- TypeScript types included.

## Installation

```bash
npm install anki-apkg-parser
```

Requires Node.js 22.13 or newer. The package is ESM-only.

## Usage

```js
import { Apkg } from 'anki-apkg-parser';

try {
  // unpack the deck into a folder (created if missing) and get an Apkg instance
  const apkg = await Apkg.create('./deck.apkg', './unpacked');

  // media files list: { '0': 'car.jpg', '1': 'cable-car.mp3' }
  const media = await apkg.getMedia();

  // open the deck database
  const db = await apkg.getDb();

  // all notes, each with its cards in note.cards
  const notes = await db.getNotes();

  // note types (models) with their templates and fields
  const models = await db.getModels();

  // any SQL query
  const cards = await db.all('SELECT * FROM cards');
  const firstNote = await db.get('SELECT * FROM notes LIMIT 1');

  await db.close();
} catch (e) {
  console.log('Failed to read the deck', e);
}
```

## Examples

### Get the text of each note

Note fields are stored in one string separated by the `0x1F` character.

```js
const apkg = await Apkg.create('./deck.apkg', './unpacked');
const db = await apkg.getDb();

for (const note of await db.getNotes()) {
  const [front, back] = note.flds.split('\x1f');
  console.log(front, '→', back);
}

await db.close();
```

### Save media files with their original names

Inside the unpacked folder media files are named `0`, `1`, `2`… `getMedia()` maps them to the original names.

```js
import fs from 'node:fs';
import path from 'node:path';

const apkg = await Apkg.create('./deck.apkg', './unpacked');
const media = await apkg.getMedia();

fs.mkdirSync('./media', { recursive: true });
for (const [file, name] of Object.entries(media)) {
  fs.copyFileSync(path.join('./unpacked', file), path.join('./media', name));
}
```

### Find cards of a note

```js
const db = await apkg.getDb();

const note = await db.get('SELECT * FROM notes WHERE sfld = ?', 'Car');
const cards = await db.all('SELECT * FROM cards WHERE nid = ?', note.id);
```

### Open a deck that is already unpacked

```js
const apkg = new Apkg('./unpacked');
const db = await apkg.getDb();
```

## API

### `Apkg`

#### `Apkg.create(file, folder): Promise<Apkg>`

Unpacks `file` into `folder` (created if missing) and returns an `Apkg` instance. Compressed files inside new-format decks are decompressed automatically.

Database and metadata files left in `folder` by a previously unpacked deck are removed first, so you can reuse the same folder. Other files in the folder are not touched.

Throws if the file is missing, is not a valid archive, or a compressed file inside it is corrupted.

#### `new Apkg(folder)`

Opens a folder that was already unpacked earlier by `Apkg.create` or `Unpack`. Folders unpacked by other tools may not be readable on Node.js 24+, see [Text comparison](#text-comparison).

#### `apkg.getDb(): Promise<Db>`

Opens the deck database and returns it. The newest database format found in the folder is used.

#### `apkg.getMedia(): Promise<Record<string, string>>`

Returns the mapping from media file names in the folder to the original names: `{ '0': 'car.jpg' }`.

### `Db`

Notes and cards:

| Method | Returns |
| --- | --- |
| `getNotes()` | All notes, each with its cards in `note.cards` |
| `getModels()` | Note types (models) keyed by id, with templates in `tmpls` and fields in `flds` |
| `getCollection()` | The `col` row with `conf`, `models`, `decks` and `tags` parsed from JSON |
| `getDeckConfig()` | The first row of `deck_config` |

Raw SQL:

| Method | Description |
| --- | --- |
| `all(sql, ...params)` | All rows |
| `get(sql, ...params)` | The first row or `undefined` |
| `run(sql, ...params)` | Runs a statement, returns `{ lastID, changes }` |
| `exec(sql)` | Runs one or more statements without parameters |
| `prepare(sql)` | Native `StatementSync` |
| `getDatabaseInstance()` | Native `DatabaseSync` |
| `close()` | Closes the database |

Parameters can be passed as a list, an array or an object with named values:

```js
await db.all('SELECT * FROM cards WHERE nid = ?', noteId);
await db.all('SELECT * FROM cards WHERE nid = ? AND ord = ?', [noteId, 0]);
await db.get('SELECT * FROM notes WHERE id = $id', { $id: noteId });
```

Rows are plain objects, BLOB columns are returned as `Buffer`.

### `Unpack`

Low-level unpacking without opening the database:

```js
import { Unpack } from 'anki-apkg-parser';

await new Unpack().unpack('./deck.apkg', './unpacked');
```

## Deck formats

Anki has changed the deck format several times. Some methods depend on it:

| | `collection.anki2` / `.anki21` (legacy) | `collection.anki21b` (Anki 2.1.50+) |
| --- | --- | --- |
| `getNotes()` | ✔ | ✔ |
| `getModels()` | ✔ from `col.models` | ✔ from `notetypes`, `templates`, `fields` tables |
| `getMedia()` | ✔ JSON | ✔ Protocol Buffers |
| `getCollection()` | ✔ | ✘ throws: models and decks are stored in separate tables |
| `getDeckConfig()` | ✘ throws: no `deck_config` table | ✔ `config` is a raw Protocol Buffers message |

The structure of `getModels()` items differs between formats. Template HTML is available as `qfmt` and `afmt` in both.

For the database schema see the [Anki database structure](https://github.com/ankidroid/Anki-Android/wiki/Database-Structure) description.

### Text comparison

New-format databases declare name columns (note types, templates, fields, decks, tags) with Anki's own `unicase` collation, which `node:sqlite` can't provide. On unpacking, it is replaced with SQLite's built-in `NOCASE` in the unpacked copy of the database. As a result, comparisons like `WHERE name = ?` ignore case only for Latin letters: `'APPLE'` matches `Apple`, but `'ёлка'` does not match `Ёлка`.

## Migrating from 1.x

- Node.js 22.13+ is required. The `sqlite` and `sqlite3` packages are replaced with the built-in `node:sqlite`.
- `open`, `close`, `all`, `get`, `run` and `exec` keep the same async signatures.
- `Db` is no longer an instance of `Database` from the `sqlite` package. Use `db.getDatabaseInstance()` for the native database.
- SQL errors come from `node:sqlite`: `error.code` is `ERR_SQLITE_ERROR`, the SQLite code is in `errcode` and `errstr`.
- On Node.js 22, opening a database prints `ExperimentalWarning: SQLite is an experimental feature`. It does not affect the result.

## License

[MIT](LICENSE)
