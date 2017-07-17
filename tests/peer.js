var test = require('tape')
var Dat = require('..')

test('replicate a dat', function (t) {
  var dat = new Dat()
  t.equals(dat.repos.length, 0, 'has zero repos before adding')
  var key = window.location.hash.replace('#', '')
  if (!key.length) key = null

  dat.add(key, function (repo) {
    var url = window.location.host + '/#' + repo.key.toString('hex')
    document.querySelector('body').innerHTML = `<a href="${url}" target="_blank">${url}</a>`
    var therepo = dat.get(repo.key)
    t.equals(therepo.key, repo.key, 'get works')
    t.equals(dat.repos.length, 1, 'clone has one repo after adding')
    if (repo.archive.owner) {
      console.log('writing to dat')
      var writer = repo.archive.createFileWriteStream('hello.txt')
      writer.write('world')
      writer.end()
      t.end()
    } else {
      console.log('reading from dat')
      t.equals(repo.archive.key.toString('hex'), key)
      repo.swarm.on('peer', function (conn) {
        t.ok(conn, 'got a peer')
      })
      repo.archive.on('syncing', function () {
        t.ok('syncing', 'syncing')
      })
      repo.archive.on('sync', function () {
        t.equals(repo.archive.content.bytes, 5, 'have same size')
        t.end()
      })
    }
  })
})
