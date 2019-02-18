var Dat = require('..')
var test = require('tape')
var concat = require('concat-stream')
const pump = require('pump')

var DAT_PROTOCOL = 'dat://'
var DAT_KEY_STRING_LENGTH = 64
var DAT_KEY_BYTE_LENGTH = 32
var DAT_URL_LENGTH = DAT_PROTOCOL.length + DAT_KEY_STRING_LENGTH

test('create a dat in memory', function (t) {
  t.plan(6)
  var dat = new Dat()
  t.equals(dat.repos.length, 0, 'has zero repos before adding')
  var repo = dat.add()

  dat.on('repo', (repo) => {
    t.ok(repo, 'emits the repo event')
    t.equals(repo.url.length, DAT_URL_LENGTH, 'repo key is there')
  })

  t.equals(dat.repos.length, 1, 'has one repo after adding')
  repo.ready(() => {
    t.equals(repo.archive.key.length, DAT_KEY_BYTE_LENGTH, 'has key with proper length')
    t.equals(repo.archive.key.toString('hex'), repo.url.slice(DAT_PROTOCOL.length), 'key is the archive key')

    repo.close()

    repo.on('close', function () {
      dat.close()
    })
  })

  dat.on('close', () => {
    t.end()
  })
})

test('replicate a dat using WebRTC', function (t) {
  var dat1 = new Dat()
  var dat2 = new Dat()
  t.equals(dat1.repos.length, 0, 'has zero repos before adding')
  t.equals(dat2.repos.length, 0, 'has zero repos before adding')

  var repo1 = dat1.add(null)

  repo1.ready(() => {

    repo1.archive.writeFile('/example.txt', 'Hello World!', (err) => {
      t.notOk(err, 'no error when writing')

      var url = repo1.url

      repo2 = dat2.get(url)

      repo2.archive.readFile('/example.txt', 'utf-8', (err, data) => {
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


test('replicate a dat over websockets', function (t) {
  t.plan(4)

  var dat = new Dat({
    gateway: 'ws://gateway.mauve.moe:3000'
  })

  t.equals(dat.repos.length, 0, 'has zero repos before adding')

  // Load the dat project website through the WS gateway
  var key = '60c525b5589a5099aa3610a8ee550dcd454c3e118f7ac93b7d41b6b850272330'
  var repo = dat.add(key);

  repo.once('ready', () => {
    t.equals(repo.archive.key.toString('hex'), key, 'has the correct key')

    // Load the about page
    repo.archive.readFile('/about/index.html', 'utf-8', function (err, data) {
      t.notOk(err, 'no error')
      t.ok(data, 'loaded data from archive')
      dat.close()
    })
  })

  repo.once('close', () => {
    t.end()
  })
})

test('use readStream without waiting for the ready event', function (t) {
  var dat = new Dat({
    gateway: 'ws://gateway.mauve.moe:3000'
  })

  var key = '60c525b5589a5099aa3610a8ee550dcd454c3e118f7ac93b7d41b6b850272330'
  var repo = dat.get(key);

  var readStream = repo.archive.createReadStream('/about/index.html')

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

test('replicate multiple repos over WebRTC', function (t) {
  var dat1 = new Dat()
  var dat2 = new Dat()

  var repo1_1 = dat1.add(null)
  var repo2_2 = dat2.add(null)

  repo1_1.ready(function () {
    repo1_1.archive.writeFile('/example.txt', 'Hello World!', 'utf-8')
    repo2_2.ready(function () {
      repo2_2.archive.writeFile('/example.txt', 'Hello World!', 'utf-8')

      const repo1_2 = dat2.get(repo1_1.url)
      const repo2_1 = dat1.get(repo2_2.url)

      repo1_2.ready(function () {
        repo2_1.ready(function () {
          repo1_2.archive.readFile('/example.txt', function(err1, data1) {
            t.notOk(err1, 'no error reading first repo')
            t.ok(data1, 'got data from first repo')
            repo2_1.archive.readFile('/example.txt', function(err2, data2) {
              t.notOk(err2, 'no error reading second repo')
              t.ok(data2, 'got data from second repo')
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
