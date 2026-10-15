import * as fs from 'fs';
import * as path from 'path';
import { pipeline } from 'node:stream/promises';
import * as fzstd from 'fzstd';
import yauzl from 'yauzl';
import { Transform } from 'node:stream';
import { createReadStream, createWriteStream } from 'node:fs';
import { DB_FILES } from '../constants.js';

const ZSTD_MAGIC = Buffer.from([0x28, 0xb5, 0x2f, 0xfd]);
const ZST_DIR = 'zst'; // prefix of temporary folder for decompressed files

export default class Unpack {

  /**
   * Unzip apkg file
   * @param file - .apkg deck path
   * @param out - unpacking path (folder)
   */
  async unpack(file: string, out: string): Promise<void> {
    if (!fs.existsSync(file)) throw new Error('File not found: ' + file);

    this.createDir(out);
    this.removeLeftovers(out);

    // decompress deck
    await new Promise((resolve, reject) => {
      yauzl.open(file, {lazyEntries: true}, function(err, zipfile) {
        if (err) return reject(err);
        zipfile.readEntry();

        zipfile.on("end", () => {
          resolve(true);
        });
        zipfile.on("error", (e) => {
          reject(e)
        })
        zipfile.on("entry", function(entry) {
          if (/\/$/.test(entry.fileName)) return zipfile.readEntry();

          zipfile.openReadStream(entry, function(err, readStream) {
            if (err) {
              zipfile.close();
              return reject(err);
            }

            pipeline(readStream, fs.createWriteStream(path.join(out, entry.fileName)))
              .then(() => zipfile.readEntry())
              .catch((e) => {
                zipfile.close();
                reject(new Error(`Failed to extract "${entry.fileName}": ${e?.message}`));
              });
          });
        });
      });
    });

    const zst = fs.mkdtempSync(path.join(out, `${ZST_DIR}-`));

    // unzip zstd
    const files = fs.readdirSync(out);

    try {
      for (let file of files) {
        const target = path.join(out, file);
        if (fs.lstatSync(target).isDirectory()) continue;
        if (!this.isZstd(target)) continue;

        const targetUnzst = path.join(zst, file);
        try {
          await this.decompress(target, targetUnzst);
        } catch (e: any) {
          // keeping a compressed file in place leads to misleading errors later,
          // e.g. "SQLITE_NOTADB: file is not a database" for collection.anki21b
          throw new Error(`Failed to decompress "${file}" (zstd): ${e?.message}`);
        }

        fs.renameSync(targetUnzst, target);
      }
    } finally {
      fs.rmSync(zst, { recursive: true, force: true });
    }
  }

  /**
   * Decompress zstd file
   * @returns output path or null if decompression failed
   */
  async unzstdFile(inputPath: string, outputPath: string) {
    try {
      await this.decompress(inputPath, outputPath);
      return outputPath;
    } catch (err: any) {
      return null;
    }
  }

  private async decompress(inputPath: string, outputPath: string): Promise<void> {
    try {
      await pipeline(
        createReadStream(inputPath),
        new ZstdDecompressor(),
        createWriteStream(outputPath)
      );
    } catch (err) {
      fs.rmSync(outputPath, { recursive: true, force: true });
      throw err;
    }
  }

  /**
   * Checks zstd frame magic number (28 B5 2F FD)
   */
  private isZstd(file: string): boolean {
    const fd = fs.openSync(file, 'r');
    try {
      const buf = Buffer.alloc(4);
      const read = fs.readSync(fd, buf, 0, 4, 0);
      return read === 4 && buf.equals(ZSTD_MAGIC);
    } finally {
      fs.closeSync(fd);
    }
  }

  /**
   * Removes files which can be left in the folder after unpacking another deck.
   * Stale databases or sqlite -wal/-shm files are picked up by sqlite and Apkg
   * and give data of the previous deck or a corrupted database.
   * @param out unpacking folder
   */
  private removeLeftovers(out: string) {
    const names = [ZST_DIR, 'media', 'meta'];
    for (const db of Object.values(DB_FILES)) {
      names.push(db, `${db}-wal`, `${db}-shm`, `${db}-journal`);
    }

    for (const name of names) {
      fs.rmSync(path.join(out, name), { recursive: true, force: true });
    }
  }

  /**
   * Creates new dir if it doesn't exists
   * @param path folder path
   */
  private createDir(path: string) {
    try {
      if (!fs.existsSync(path)) {
        fs.mkdirSync(path, { recursive: true });
      }
    } catch (e) {
      throw new Error('Fail to create temporary deck folder: ' + e);
    }
  }
}


class ZstdDecompressor extends Transform {
  public decompressor: any = null;

  constructor() {
    super();
    this.decompressor = new fzstd.Decompress((chunk: any) => {
      this.push(chunk);
    });
  }

  _transform(chunk: any, encoding: any, callback: Function) {
    try {
      this.decompressor.push(chunk);
      callback();
    } catch (err) {
      callback(err);
    }
  }

  _flush(callback: Function) {
    try {
      this.decompressor.push(new Uint8Array(0), true);
      callback();
    } catch (err) {
      callback(err);
    }
  }
}