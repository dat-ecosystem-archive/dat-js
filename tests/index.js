var Dat = require('..')
var test = require('tape')

var DAT_PROTOCOL = 'dat://'
var DAT_KEY_STRING_LENGTH = 64
var DAT_KEY_BYTE_LENGTH = 32
var DAT_URL_LENGTH = DAT_PROTOCOL.length + DAT_KEY_STRING_LENGTH

test('create a dat in memory', function (t) {
  t.plan(6)
  var dat = new Dat()
  t.equals(dat.repos.length, 0, 'has zero repos before adding')
  var repo = dat.add()

  t.equals(dat.repos.length, 1, 'has one repo after adding')
  repo.ready(() => {
    t.equals(repo.archive.key.length, DAT_KEY_BYTE_LENGTH, 'has key with proper length')
    t.equals(repo.archive.key.toString('hex'), repo.url.slice(DAT_PROTOCOL.length), 'key is the archive key')

    // TODO: What's this for?
    repo.on('close', function () {
    })
  })

  dat.on('repo', (repo) => {
    t.ok(repo, 'emits the repo event')
    t.equals(repo.url.length, DAT_URL_LENGTH, 'repo key is there')
    dat.close()
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

        t.equals(data, 'Hello World!')

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
  var dat = new Dat({
    websocketServer: 'ws://gateway.mauve.moe:3000'
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
