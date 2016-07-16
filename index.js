var lineReader = require('line-reader');
var sqlite3 = require('sqlite3').verbose();

function parseLine(line) {
    line.replace('\t', ' ');
    var cursor = line.indexOf(' ');
    var book = line.substring(0, cursor);
    var chapterAndVerse = line.substring(cursor, line.indexOf(' ', cursor + 1)).trim();
    cursor = line.indexOf(' ', cursor);
    var text = line.substr(line.indexOf(' ', cursor + 1), line.length).trim();
    var chapter = chapterAndVerse.split(':')[0];
    var verse = chapterAndVerse.split(':')[1];

    return {
        book: book,
        chapter: parseInt(chapter),
        verse: verse,
        text: text
    }
}

var current = {
    book: undefined,
    chapter: undefined
}

function handleLine(line, last, done) {
    var parsed = parseLine(line);

    if (current.book === undefined || current.book.name !== parsed.book) {
        db.run('insert into book(name) values($name)', {
            $name: parsed.book
        }, function(err) {
            if (err) console.log(err)
            current.book = {
                name: parsed.book,
                id: this.lastID
            }
            handleLine(line, last, done)
        });
    } else if (current.chapter === undefined || current.chapter.number !== parsed.chapter) {
        db.run('insert into chapter(number, book_id) values($ch_number, $book_id)', {
            $ch_number: parsed.chapter,
            $book_id: current.book.id
        }, function(err) {
            if (err) console.log(err)
            current.chapter = {
                number: parsed.chapter,
                id: this.lastID
            }
            handleLine(line, last, done)
        });
    } else {
        db.run('insert into verse(chapter_id, number, text) values($chapter_id, $verse_number, $text)', {
            $chapter_id: current.chapter.id,
            $verse_number: parsed.verse,
            $text: parsed.text
        }, function(err) {
            if (err) console.log(err)
            console.log('Imported: ' + JSON.stringify(parsed))
            if (last) console.log('Done.')
            done()
        });
    }
}

var db = new sqlite3.Database('bible.db', sqlite3.OPEN_READWRITE, (err) => {
    if (err) console.log(err)
    db.serialize(function() {

        // Comment this if you don't want to delete everything before import
        db.run('delete from book')
        db.run('delete from chapter')
        db.run('delete from verse')
        //

        lineReader.eachLine('input.txt', handleLine);
    })
});
