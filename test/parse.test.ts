import test from 'ava';
import { Apkg, Unpack } from 'anki-apkg-parser';
import { fileURLToPath } from 'url';
import path, { dirname } from 'path';
import fs from 'fs';

// @ts-ignore
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

test('Invalid file', async (t) => {
  const deck = __dirname + '/decks/broken_deck.apkg';
  const temp = __dirname + '/temp/';

  const p = new Unpack();

  const error = await t.throwsAsync(p.unpack(deck, temp));
  t.truthy(error?.message);
});

test('Get Notes from new deck', async (t) => {
  const apkg = await createApkg('new_deck.apkg');

  const db = await apkg.getDb();
  const res: any[] = await db.getNotes();

  t.is(res?.length, 5);  
});

test('Get Notes from old deck', async (t) => {
  const apkg = await createApkg('legacy_deck.apkg');
  const db: any = await apkg.getDb();
  const res = await db.getNotes();

  t.is(res?.length, 5);
});

test('Get Media legacy', async (t) => {
  const apkg = await createApkg('legacy_deck.apkg');

  const res = await apkg.getMedia();
  t.deepEqual(res, { '0': 'download.jpg', '1': 'cable-car.mp3' });
});

test('Get Media new deck', async (t) => {
  const apkg = await createApkg('new_deck.apkg');
  const res = await apkg.getMedia();

  t.pass();
  t.deepEqual(res, { '0': 'download.jpg', '1': 'cable-car.mp3' });
});

test('Check models new', async (t) => {
  const apkg = await createApkg('deck_media_new.apkg');
  const db: any = await apkg.getDb();
  const res = await db.getModels();

  t.is(res['1681197006761'].name, 'Basic (and reversed card)');

  const tmp = res['1681197006761'].tmpls.slice().sort((a: any, b: any) => a.ord - b.ord);

  t.is(tmp[0].name, 'Card 1');
  t.is(tmp[1].name, 'Card 2');
  t.truthy(tmp[0].qfmt);
  t.truthy(tmp[1].qfmt);
  t.truthy(tmp[0].afmt);
  t.truthy(tmp[1].afmt);
});

test('Check models old', async (t) => {
  const apkg = await createApkg('deck_media_old.apkg');
  const db: any = await apkg.getDb();
  const res = await db.getModels();

  t.is(res['1681197006761'].name, 'Basic (and reversed card)');

  const tmp = res['1681197006761'].tmpls.slice().sort((a: any, b: any) => a.ord - b.ord);

  t.is(tmp[0].name, 'Card 1');
  t.is(tmp[1].name, 'Card 2');
  t.truthy(tmp[0].qfmt);
  t.truthy(tmp[1].qfmt);
  t.truthy(tmp[0].afmt);
  t.truthy(tmp[1].afmt);
});


test('Test real decks', async (t) => {
  let apkg = await createApkg('other/1.apkg');
  let db = await apkg.getDb();
  let notes = await db.getNotes();

  t.truthy(!!notes?.[0]?.id);

  apkg = await createApkg('other/2.apkg');
  db = await apkg.getDb();
  notes = await db.getNotes();

  t.truthy(!!notes?.[0]?.id);

  apkg = await createApkg('other/3.apkg');
  db = await apkg.getDb();
  notes = await db.getNotes();

  t.truthy(!!notes?.[0]?.id);
  t.truthy(!!notes?.[0]?.id);

  apkg = await createApkg('other/4.apkg');
  db = await apkg.getDb();
  notes = await db.getNotes();

  t.truthy(!!notes?.[0]?.id);
  t.truthy(!!notes?.[0]?.id);

  apkg = await createApkg('other/5.apkg');
  db = await apkg.getDb();
  notes = await db.getNotes();

  t.truthy(!!notes?.[0]?.id);
  t.truthy(!!notes?.[0]?.id);

  apkg = await createApkg('other/6.apkg');
  db = await apkg.getDb();
  notes = await db.getNotes();

  t.truthy(!!notes?.[0]?.id);
  t.truthy(!!notes?.[0]?.id);

  apkg = await createApkg('other/7.apkg');
  db = await apkg.getDb();
  notes = await db.getNotes();

  t.truthy(!!notes?.[0]?.id);
  t.truthy(!!notes?.[0]?.id);

  apkg = await createApkg('other/8.apkg');
  db = await apkg.getDb();
  notes = await db.getNotes();

  t.truthy(!!notes?.[0]?.id);
  t.truthy(!!notes?.[0]?.id);

  apkg = await createApkg('other/9.apkg');
  db = await apkg.getDb();
  notes = await db.getNotes();

  t.truthy(!!notes?.[0]?.id);
  t.truthy(!!notes?.[0]?.id);

  apkg = await createApkg('other/10.apkg');
  db = await apkg.getDb();
  notes = await db.getNotes();

  t.truthy(!!notes?.[0]?.id);
});

test('Broken zstd database throws a decompression error', async (t) => {
  const error = await t.throwsAsync(createApkg('broken_zstd_deck.apkg'));

  t.regex(error?.message || '', /Failed to decompress "collection\.anki21b"/);
});

test('Stale sqlite wal file is removed on unpacking', async (t) => {
  const deck = path.join(__dirname, 'decks', 'new_deck.apkg');
  const temp = path.join(__dirname, 'temp', 'stale_wal');
  const wal = path.join(temp, 'collection.anki21b-wal');
  if (fs.existsSync(temp)) fs.rmSync(temp, {recursive: true});

  // make wal file with changes, which sqlite applies on next open
  let apkg = await Apkg.create(deck, temp);
  let db = await apkg.getDb();
  await db.exec('PRAGMA wal_autocheckpoint=0');
  await db.run('DELETE FROM notes');
  const walData = fs.readFileSync(wal);
  await db.close();
  fs.writeFileSync(wal, walData);

  apkg = await Apkg.create(deck, temp);
  db = await apkg.getDb();
  const notes = await db.getNotes();
  await db.close();

  t.is(notes.length, 5);
});

test('Database of previous deck is removed on unpacking', async (t) => {
  const temp = path.join(__dirname, 'temp', 'reuse_folder');
  if (fs.existsSync(temp)) fs.rmSync(temp, {recursive: true});

  await Apkg.create(path.join(__dirname, 'decks', 'new_deck.apkg'), temp);
  const apkg = await Apkg.create(path.join(__dirname, 'decks', 'legacy_deck.apkg'), temp);

  t.false(fs.existsSync(path.join(temp, 'collection.anki21b')));
  t.deepEqual(await apkg.getMedia(), { '0': 'download.jpg', '1': 'cable-car.mp3' });
});

test('zstd decompress', async (t) => {
  const file = __dirname + '/zstd/test.txt.zst';
  const out = __dirname + '/temp/test.txt';

  const parser = new Unpack();
  await parser.unzstdFile(file, out)

  t.pass();
});



async function createApkg(name: string) {
  const deck = path.join(__dirname, 'decks', name);
  // unique folder: tests run concurrently and may unpack the same deck
  fs.mkdirSync(path.join(__dirname, 'temp'), {recursive: true});
  const temp = fs.mkdtempSync(path.join(__dirname, 'temp', path.basename(name) + '-'));

  return await Apkg.create(deck, temp);
}