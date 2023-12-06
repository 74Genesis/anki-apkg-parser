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
    for (let row of noteRows) {
      let { id, guid, mid, mod, usn, tags, flds, sfld, csum, flags, data } = row; // note

      notes[id] = <INote>{ id, guid, mid, mod, usn, tags, flds, sfld, csum, flags, data, cards: [] };
    }

    for (let row of cardRows) {
      if (notes?.[row?.nid]?.cards) {
        let {
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
  async getCollection(): Promise<Database> {
    const res = await this.get('SELECT * FROM col');
    res.conf = JSON.parse(res.conf);
    res.models = JSON.parse(res.models);
    res.decks = JSON.parse(res.decks);
    res.tags = JSON.parse(res.tags);

    return res;
  }
}
