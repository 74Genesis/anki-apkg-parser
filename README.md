## anki-apkg-parser

> Node.js library to parse anki decks (.apkg files).
> Supports parsing notes, cards, media files, custom db queries

## Installation `anki-apkg-parser`

Installation guide.

`coming soon...`

`$ npm i`

## Usage

The library provides two classes `Unpack` and `Deck`

Anki decks are compressed archives, so we should unpack it first using `Unpack` class:

```typescript
import { Unpack, Deck } from 'anki-apkg-parser';

const deckPath = './favorite-cards.apkg';
const outPath = './deck-folder';

try {
    const unpack = new Unpack();
    // pass the deck path and the output path for unpacking the deck
    await unpack.unpack(deckPath, outPath);
}
...
```

Some files you can see after unpacking the deck:

`0`, `1`, `2` - files with number names are media files (images, audio, video)
`collection.anki2` - old version of anki database
`collection.anki21` - more modern version of database
`collection.anki21b` - the latest databse version
`media` - Associative list of media files. Their numbers and real names. (Protocol Buffer or json file)
`meta` - Meta data (Protocol Buffer or json file)

Quick usage of `Deck` class:

```typescript
import { Unpack, Deck } from 'anki-apkg-parser';

// create deck instance using path to unpacked deck
const outPath = './deck-folder';
const deck = new Deck(outPath);


try {
    // open the database
    const db = await deck.dbOpen();

    // fetch list of all notes
    await db.getNotes();

    // fetch colleciton raw
    await db.getCollection();


    /**
     * Anki deck contains sqlite databases
     * so when you call dbOpen(), you will recieve an instance of sqlite library
     * You are free to use any 'sqlite' api
     */

    // make an SQL request by native sqlite api
    await db.get('SELECT * FROM col');
}
...
```

## Advanced usage

TODO: descripbe this part

```typescript
import { Unpack, Deck } from 'anki-apkg-parser';

const outPath = './deck-folder';

try {
    const outPath = './deck-folder';
    const deck = new Deck(outPath);

    let db;

    // get cards from anki2 db file
    if (deck.anki2) db = await deck.anki2.open()
    db.get('SELECT * FROM cards')
}
...
```
