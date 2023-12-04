import test from 'ava';
import { Unpack, AnkiDb } from 'anki-apkg-parser';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { new_deck, legacy_deck } from './mocks/decks.js';
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
  const deck = __dirname + '/decks/new_deck.apkg';
  const temp = __dirname + '/temp/';

  if (fs.existsSync(temp)) fs.rmSync(temp, { recursive: true });

  const p = new Unpack();
  await p.unpack(deck, temp);

  const db = new AnkiDb(temp);
  await db.open();

  const res = await db.getNotes();
  console.log(res);
  t.truthy(p);
});

test('Get Notes from old deck', async (t) => {
  const deck = __dirname + '/decks/legacy_deck.apkg';
  const temp = __dirname + '/temp/';

  if (fs.existsSync(temp)) fs.rmSync(temp, { recursive: true });

  const p = new Unpack();
  await p.unpack(deck, temp);

  const db = new AnkiDb(temp);
  await db.open();

  const res = await db.getNotes();
  console.log(res);
  t.truthy(p);
});

test('Get Media legacy', async (t) => {
  const deck = __dirname + '/decks/legacy_deck.apkg';
  const temp = __dirname + '/temp/';

  if (fs.existsSync(temp)) fs.rmSync(temp, { recursive: true });

  const p = new Unpack();
  await p.unpack(deck, temp);

  const db = new AnkiDb(temp);
  await db.open();

  const res = await db.getMedia();
  t.deepEqual(res, { '0': 'download.jpg', '1': 'cable-car.mp3' });
});

test('Get Media new deck', async (t) => {
  const deck = __dirname + '/decks/new_deck.apkg';
  const temp = __dirname + '/temp/';

  if (fs.existsSync(temp)) fs.rmSync(temp, { recursive: true });

  const p = new Unpack();
  await p.unpack(deck, temp);

  const db = new AnkiDb(temp);
  await db.open();

  const res = await db.getMedia();
  t.deepEqual(res, { '0': 'download.jpg', '1': 'cable-car.mp3' });
});

test.only('Get Templates', async (t) => {
  const deck = __dirname + '/decks/deck_media_new.apkg';
  const temp = __dirname + '/temp/';

  if (fs.existsSync(temp)) fs.rmSync(temp, { recursive: true });

  const p = new Unpack();
  await p.unpack(deck, temp);

  const db = new AnkiDb(temp);
  await db.open();

  const res = await db.getMedia();
  t.deepEqual(res, { '0': 'download.jpg', '1': 'cable-car.mp3' });
});
