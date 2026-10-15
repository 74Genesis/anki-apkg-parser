import { DatabaseSync, type SQLInputValue, type StatementSync } from 'node:sqlite';
import INote from '../interfaces/INote.js';

export type SqlParam = SQLInputValue | Record<string, SQLInputValue>;

/**
 * Wrapper around built-in `node:sqlite`.
 * Methods are async to keep compatibility with the previous `sqlite` package API.
 */
export default abstract class Db {
  readonly filename: string;
  private db: DatabaseSync | null = null;

  constructor(filename: string) {
    this.filename = filename;
  }

  async open(): Promise<void> {
    if (this.db) return;
    this.db = new DatabaseSync(this.filename);
  }

  async close(): Promise<void> {
    this.db?.close();
    this.db = null;
  }

  /**
   * Native `node:sqlite` database for queries which are not covered by this wrapper
   */
  getDatabaseInstance(): DatabaseSync {
    if (!this.db) throw new Error('Database is not opened');
    return this.db;
  }

  prepare(sql: string): StatementSync {
    return this.getDatabaseInstance().prepare(sql);
  }

  async exec(sql: string): Promise<void> {
    this.getDatabaseInstance().exec(sql);
  }

  async all<T = any[]>(sql: string, ...params: SqlParam[] | [SqlParam[]]): Promise<T> {
    const rows = this.prepare(sql).all(...normalizeParams(params));
    return rows.map(normalizeRow) as T;
  }

  async get<T = any>(sql: string, ...params: SqlParam[] | [SqlParam[]]): Promise<T | undefined> {
    const row = this.prepare(sql).get(...normalizeParams(params));
    return (row ? normalizeRow(row) : undefined) as T | undefined;
  }

  async run(sql: string, ...params: SqlParam[] | [SqlParam[]]): Promise<{ lastID: number | bigint, changes: number | bigint }> {
    const res = this.prepare(sql).run(...normalizeParams(params));
    return { lastID: res.lastInsertRowid, changes: res.changes };
  }

  /**
   * Notes list indexed by id
   * {
   *    '123': <INote>{...},
   *    '456': <INote>{...},
   * }
   * @returns list of INote objects
   */
  async getNotes(): Promise<INote[]> {
    const noteRows = await this.all('SELECT * from notes');
    const cardRows = await this.all('SELECT * from cards');

    const indexedCards: any = {}
    for (const row of cardRows) {
      if (!indexedCards[row?.nid]) indexedCards[row?.nid] = [];

      const {
        id,
        nid,
        did,
        ord,
        mod,
        usn,
        type,
        queue,
        due,
        ivl,
        factor,
        reps,
        lapses,
        left,
        odue,
        odid,
        flags,
        data,
      } = row;

      indexedCards[row?.nid].push({
        id,
        nid,
        did,
        ord,
        mod,
        usn,
        type,
        queue,
        due,
        ivl,
        factor,
        reps,
        lapses,
        left,
        odue,
        odid,
        flags,
        data,
      });
    }

    const notes: INote[] = [];
    for (const row of noteRows) {
      const { id, guid, mid, mod, usn, tags, flds, sfld, csum, flags, data } = row; // note

      const cards = (indexedCards?.[id]) ? indexedCards[id] : [];

      notes.push({ id, guid, mid, mod, usn, tags, flds, sfld, csum, flags, data, cards });
    }

    return notes;
  }

  /**
   * returns collection info with json parsed configs
   * @returns collection json
   */
  async getCollection(): Promise<any> {
    const res = await this.get('SELECT * FROM col');
    res.conf = JSON.parse(res.conf);
    res.models = JSON.parse(res.models);
    res.decks = JSON.parse(res.decks);
    res.tags = JSON.parse(res.tags);

    return res;
  }

  async getDeckConfig(): Promise<any> {
    const res = await this.get('SELECT * FROM deck_config');
    res.config = Buffer.from(res.config, 'hex').toString('utf-8');
    return res;
  }

  async getModels(): Promise<any> {
    const col = await this.getCollection();
    return col?.models;
  }
}

/**
 * Supports both call styles: all(sql, a, b) and all(sql, [a, b])
 */
function normalizeParams(params: SqlParam[] | [SqlParam[]]): any[] {
  if (params.length === 1 && Array.isArray(params[0])) return params[0];
  return params;
}

/**
 * node:sqlite returns rows with null prototype and blobs as Uint8Array,
 * convert them to plain objects with Buffer blobs like the `sqlite3` driver did
 */
function normalizeRow(row: Record<string, any>): Record<string, any> {
  const res: Record<string, any> = {};
  for (const key in row) {
    const value = row[key];
    res[key] = value instanceof Uint8Array && !Buffer.isBuffer(value)
      ? Buffer.from(value.buffer, value.byteOffset, value.byteLength)
      : value;
  }
  return res;
}
