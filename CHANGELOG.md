# Changelog

All notable changes to this project are documented in this file.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project follows [Semantic Versioning](https://semver.org/).

## [2.0.0] - 2026-10-15

### Breaking changes

- Node.js 22.13 or newer is required.
- The database is opened with the built-in `node:sqlite` instead of the `sqlite` and `sqlite3` packages. `Db` is no longer an instance of `Database` from `sqlite`; the `open`, `close`, `all`, `get`, `run` and `exec` methods keep the same async signatures. Use `db.getDatabaseInstance()` for the native `DatabaseSync`.
- SQL errors now come from `node:sqlite` (`error.code` is `ERR_SQLITE_ERROR`).

### Fixed

- A deck with a corrupted compressed database no longer fails later with a misleading `SQLITE_NOTADB: file is not a database` error. Unpacking now throws a clear decompression error ([#2](https://github.com/74Genesis/anki-apkg-parser/issues/2)).
- Unpacking a deck into a folder used by another deck no longer returns data of the previous deck or a corrupted database because of leftover `-wal`/`-shm` files.
- Errors while extracting the archive are reported instead of being ignored.
- TypeScript declarations work with `"moduleResolution": "nodenext"`.
- New-format decks can be read on Node.js 24+: Anki's `unicase` collation is replaced with SQLite `NOCASE` in the unpacked database.

### Changed

- Removed unused dependencies. The package now depends only on `fzstd`, `protobufjs` and `yauzl`, with no native modules.
- Updated `protobufjs` to 8 and `yauzl` to 3.4.
- Queries in `Anki21bDb` use bound parameters.
- The license in `package.json` is now MIT, matching the `LICENSE` file.

## [1.0.1] - 2026-02-09

- Installation instructions in README.

## 1.0.0 - 2026-02-09

- First release on npm.

[2.0.0]: https://github.com/74Genesis/anki-apkg-parser/compare/v1.0.1...v2.0.0
[1.0.1]: https://github.com/74Genesis/anki-apkg-parser/releases/tag/v1.0.1
