import * as fs from 'fs';
import * as path from 'path';
import * as child_process from 'child_process';
import unzipit from 'unzipit';
// import sqlite3 from 'sqlite3';
//@ts-ignore
import { fileURLToPath } from 'url';
// import { DB_FILES } from '../constants.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface Config {
  tempFilesPath?: string;
}

// TODO: save errors to log
export default class Unpack {
  private config: Config;

  constructor(config?: Config) {
    this.config = Object.assign(
      {
        // tempFilesPath: './temp/',
      },
      config || {},
    );
    const res = child_process.execSync(`type unzstd`).toString();
    if (res === 'unzstd not found') throw new Error('unzstd library not found. Please install it before');
  }

  /**
   * Unzip apkg file
   * @param p deck required to be unpacked
   * @param o folder for unpacking
   */
  async unpack(p: string, o: string): Promise<void> {
    if (!fs.existsSync(p)) throw new Error('Deck file not found in: ' + path);

    this.createTempDir(o);

    const buf = fs.readFileSync(p);
    const { entries } = await unzipit.unzip(new Uint8Array(buf));

    for (const entry of Object.values(entries)) {
      if (entry.isDirectory) {
        continue;
      }
      const data = await entry.arrayBuffer();

      const output = path.join(o, entry.name);

      if (/\.\./.test(output)) {
        console.warn('[zip warn]: ignoring maliciously crafted paths in zip file:', entry.name);
        throw new Error('File name contains special ');
      }

      // save unzipped files
      fs.mkdirSync(path.dirname(output), { recursive: true });

      // try to decompress
      fs.writeFileSync(output, new Uint8Array(data));

      try {
        child_process.execSync(`unzstd "${output}" -o "${output}_unzst" --rm`);

        fs.renameSync(`${output}_unzst`, `${output}`);
      } catch (e: any) {
        console.log('File not decompressed', output);
      }
    }
  }

  // async dbConnect(folder: string): Promise<AnkiDb> {
  //   let filename = path.join(folder, DB_FILES.latest);

  //   if (!fs.existsSync(filename)) filename = path.join(folder, DB_FILES.legacy);

  //   if (!fs.existsSync(filename)) throw new Error('Database not found in folder: ' + folder);

  //   const db = new AnkiDb({
  //     filename,
  //     driver: sqlite3.Database,
  //   });

  //   await db.open();
  //   return db;
  // }

  private createTempDir(path: string) {
    try {
      if (!fs.existsSync(path)) {
        fs.mkdirSync(path, { recursive: true });
      }
    } catch (e) {
      throw new Error('Fail to create temporary deck folder: ' + e);
    }
  }
}
