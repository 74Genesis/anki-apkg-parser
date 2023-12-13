import protobuf from 'protobufjs';
import { DB_FILES } from '../constants.js';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import DbNotFoundError from './errors/DbNotFoundError.js';
import Anki21bDb from './db/Anki21bDb.js';
import Anki21Db from './db/Anki21Db.js';
import Anki2Db from './db/Anki2Db.js';
import Db from './db/Db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default class Deck {
  public anki2: Db | null = null; // oldest db version
  public anki21: Db | null = null; // old db version
  public anki21b: Db | null = null; // latest db version

  folder = '';

  constructor(folder: string) {
    this.folder = folder;
    this.setDatabases();
  }

  /**
   * Set db instances depending on files
   */
  private setDatabases() {
    let file = path.join(this.folder, DB_FILES.anki21b);
    if (fs.existsSync(file)) this.anki21b = new Anki21bDb(file);

    file = path.join(this.folder, DB_FILES.anki21);
    if (fs.existsSync(file)) this.anki21 = new Anki21Db(file);

    file = path.join(this.folder, DB_FILES.anki2);
    if (fs.existsSync(file)) this.anki2 = new Anki2Db(file);
  }

  /**
   * Detect and return current db version used by anki
   */
  private get db(): Db | null {
    if (this.anki21b) return this.anki21b;
    if (this.anki21) return this.anki21;
    return this.anki2;
  }

  /**
   * Open and return main database
   * @returns current database
   */
  public async dbOpen(): Promise<Db> {
    if (!this.db) throw new DbNotFoundError('Database not found');

    await this.db.open();

    return this.db;
  }

  // TODO: read meta file first, to understand version of the deck and how to read media file.
  /**
   * Returns json with media files list
   * @param mediaFile - path to "media" file in case you want to manually set it
   * @returns Json media list
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
    for (const i in entries) {
      res[String(i)] = String(entries?.[i]?.name);
    }

    return res;
  }
}
