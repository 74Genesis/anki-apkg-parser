import * as fs from 'fs';
import * as path from 'path';
import * as child_process from 'child_process';
import { unzip } from 'unzipit';

// TODO: save errors to log
export default class Unpack {
  constructor() {
    const res = child_process.execSync(`type unzstd`).toString();
    if (res === 'unzstd not found') throw new Error('unzstd library not found. Please install it before');
  }

  /**
   * Unzip apkg file
   * @param p path to .apkg file
   * @param o folder for unpacking
   */
  async unpack(p: string, o: string): Promise<void> {
    if (!fs.existsSync(p)) throw new Error('Deck file not found in: ' + path);

    this.createDir(o);

    const buf = fs.readFileSync(p);
    const { entries } = await unzip(new Uint8Array(buf));

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
