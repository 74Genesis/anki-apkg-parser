import { Database } from 'sqlite';
import protobuf from 'protobufjs';
import { DB_FILES } from '../constants.js';
import * as fs from 'fs';
import * as path from 'path';
import sqlite3 from 'sqlite3';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface CardModel {
  id: any;
  nid: any;
  did: any;
  ord: any;
  mod: any;
  usn: any;
  type: any;
  queue: any;
  due: any;
  ivl: any;
  factor: any;
  reps: any;
  lapses: any;
  left: any;
  odue: any;
  odid: any;
  flags: any;
  data: any;
}
export interface NoteModel {
  id: any;
  guid: any;
  mid: any;
  mod: any;
  usn: any;
  tags: any;
  flds: any;
  sfld: any;
  csum: any;
  flags: any;
  data: any;
  cards: CardModel[]; //list of cards
}

export default class AnkiDb extends Database {
  folder: string = '';

  constructor(targetFolder: string) {
    super({
      filename: '',
      driver: sqlite3.Database,
    });

    this.folder = targetFolder;
    this.config.filename = this.actualDbFile;
  }

  get actualDbFile(): string {
    let file = path.join(this.folder, DB_FILES.latest);
    if (fs.existsSync(file)) return file;

    file = path.join(this.folder, DB_FILES.legacy);
    if (fs.existsSync(file)) return file;

    return '';
  }

  async getCol() {
    const res = await this.get('SELECT * FROM col');
    res.conf = JSON.parse(res.conf);
    res.models = JSON.parse(res.models);
    res.decks = JSON.parse(res.decks);
    res.tags = JSON.parse(res.tags);

    return res;
  }

  // TODO: read meta file first, to understand version of the deck and how to read media file.
  /**
   * Returns json with media files list
   * @param mediaFile - path to media file in case you want to manually set it
   * @returns Json with counted files list
   */
  async getMedia(mediaFile?: any): Promise<Record<string, string>> {
    const file = mediaFile || path.join(this.folder, 'media');
    if (!fs.existsSync(file)) throw new Error('Media file not found by path: ' + file);

    const buf = fs.readFileSync(file);

    // trying to parse media file as a json
    try {
      return JSON.parse(buf.toString());
    } catch (e) {
      console.log('Failed to parse media as json...');
    }

    console.log('Trying to open media file as Proxy Buffer');

    // trying to decode media file as buffer message
    let entries = [];
    try {
      const root = protobuf.loadSync(__dirname + '/../protos/import_export.proto');
      const MediaEntries = root.lookupType('anki.import_export.MediaEntries');
      const message = MediaEntries.decode(buf);
      entries = message.toJSON().entries || [];
    } catch (e: any) {
      throw new Error('Error during decode Proxy message: ' + e?.message);
    }

    const res: Record<string, string> = {};
    for (let i in entries) {
      res[String(i)] = String(entries?.[i]?.name);
    }

    // if (entries?.entries)
    return res;
  }

  /**
   * Get all notes.
   *
   * Contains full set of fields from 'notes' table plus additional pages. Look at NoteModel interface
   * @returns - returns object of all notes
   */
  async getNotes(): Promise<Record<string, NoteModel>> {
    const noteRows = await this.all('SELECT * from notes');
    const cardRows = await this.all('SELECT * from cards');

    const notes: Record<string, NoteModel> = {};
    for (let row of noteRows) {
      let { id, guid, mid, mod, usn, tags, flds, sfld, csum, flags, data } = row; // note

      notes[id] = <NoteModel>{ id, guid, mid, mod, usn, tags, flds, sfld, csum, flags, data, cards: [] };
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
        notes[row.nid].cards.push({
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
}
