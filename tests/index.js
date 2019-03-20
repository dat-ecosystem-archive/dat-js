var Dat = require('..')
var test = require('tape')
var concat = require('concat-stream')
const pump = require('pump')

var DAT_PROTOCOL = 'dat://'
var DAT_KEY_STRING_LENGTH = 64
var DAT_KEY_BYTE_LENGTH = 32
var DAT_URL_LENGTH = DAT_PROTOCOL.length + DAT_KEY_STRING_LENGTH

test('create a dat in memory', function (t) {
  t.plan(7)
  var dat = new Dat()
  t.equals(dat.archives.length, 0, 'has zero archives before adding')
  var archive = dat.create()

  dat.on('archive', (archive) => {
    t.ok(archive, 'emits the archive event')
    t.equals(archive.url.length, DAT_URL_LENGTH, 'archive key is there')
  })

  t.equals(dat.archives.length, 1, 'has one archive after adding')
  archive.ready(() => {
    t.equals(archive.key.length, DAT_KEY_BYTE_LENGTH, 'has key with proper length')
    t.equals(archive.key.toString('hex'), archive.url.slice(DAT_PROTOCOL.length), 'key is the archive key')

    archive.writeFile('/example.txt', 'Hello World!', (err) => {
      t.notOk(err, 'Successfully wrote to archive')

      archive.close()
    })
  })

  archive.on('close', function () {
    dat.close()
  })

  dat.on('close', () => {
    t.end()
  })
})

test('replicate a dat using WebRTC', function (t) {
  var dat1 = new Dat()
  var dat2 = new Dat()
  t.equals(dat1.archives.length, 0, 'has zero archives before adding')
  t.equals(dat2.archives.length, 0, 'has zero archives before adding')

  var archive1 = dat1.create()

  archive1.ready(() => {
    archive1.writeFile('/example.txt', 'Hello World!', (err) => {
      t.notOk(err, 'no error when writing')

      var url = archive1.url

      var archive2 = dat2.get(url)

      archive2.readFile('/example.txt', 'utf-8', (err, data) => {
        t.notOk(err, 'no errors when reading')

        t.equals(data, 'Hello World!', 'got proper data from archive')

        dat1.close(() => {
          dat2.close(() => {
            t.end()
          })
        })
      })
    })
  })
})

test('replicate an existing dat', function (t) {
  t.plan(4)

  var dat = new Dat()

  t.equals(dat.archives.length, 0, 'has zero archives before adding')

  // Load the dat project website through the WS gateway
  var key = '60c525b5589a5099aa3610a8ee550dcd454c3e118f7ac93b7d41b6b850272330'
  var archive = dat.get(key)

  archive.ready(() => {
    t.equals(archive.key.toString('hex'), key, 'has the correct key')

    // Load the about page
    archive.readFile('/about/index.html', 'utf-8', function (err, data) {
      t.notOk(err, 'no error')
      t.ok(data, 'loaded data from archive')
      dat.close()
    })
  })

  archive.once('close', () => {
    t.end()
  })
})

test('use readStream without waiting for the ready event', function (t) {
  var dat = new Dat()

  var key = '60c525b5589a5099aa3610a8ee550dcd454c3e118f7ac93b7d41b6b850272330'
  var archive = dat.get(key)

  var readStream = archive.createReadStream('/about/index.html')

  readStream.once('error', function (e) {
    t.fail(e)
  })

  pump(readStream, concat(function (data) {
    t.ok(data, 'got data from readStream')
    dat.close()
  }))

  dat.once('close', function () {
    t.end()
  })
})

test('replicate multiple archives over WebRTC', function (t) {
  var dat1 = new Dat()
  var dat2 = new Dat()

  var archive11 = dat1.create()
  var archive22 = dat2.create()

  archive11.ready(function () {
    archive11.writeFile('/example.txt', 'Hello World!', 'utf-8')
    archive22.ready(function () {
      archive22.writeFile('/example.txt', 'Hello World!', 'utf-8')

      var archive12 = dat2.get(archive11.url)
      var archive21 = dat1.get(archive22.url)

      archive12.ready(function () {
        archive21.ready(function () {
          archive12.readFile('/example.txt', function (err1, data1) {
            t.notOk(err1, 'no error reading first archive')
            t.ok(data1, 'got data from first archive')
            archive21.readFile('/example.txt', function (err2, data2) {
              t.notOk(err2, 'no error reading second archive')
              t.ok(data2, 'got data from second archive')
              dat1.close(function () {
                dat2.close(function () {
                  t.end()
                })
              })
            })
          })
        })
      })
    })
  })
})
