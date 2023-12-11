import { Database } from 'sqlite';
import sqlite3 from 'sqlite3';
import INote from '../interfaces/INote';

export default abstract class Db extends Database {
  constructor(filename: string) {
    super({
      filename,
      driver: sqlite3.Database,
    });
  }

  /**
   * Notes list indexed by id
   * {
   *    '123': <INote>{...},
   *    '456': <INote>{...},
   * }
   * @returns list of INote objects
   */
  async getNotes(): Promise<Record<string, INote>> {
    const noteRows = await this.all('SELECT * from notes');
    const cardRows = await this.all('SELECT * from cards');

    const notes: Record<string, INote> = {};
    for (const row of noteRows) {
      const { id, guid, mid, mod, usn, tags, flds, sfld, csum, flags, data } = row; // note

      notes[id] = <INote>{ id, guid, mid, mod, usn, tags, flds, sfld, csum, flags, data, cards: [] };
    }

    for (const row of cardRows) {
      if (notes?.[row?.nid]?.cards) {
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

        notes?.[row.nid]?.cards?.push({
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
