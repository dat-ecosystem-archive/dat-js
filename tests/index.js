var Repo = require('../repo')
var Dat = require('..')
var test = require('tape')

test('create a dat in memory', function (t) {
  t.plan(9)
  var dat = new Dat()
  t.ok(dat.swarm, 'has a swarm object')
  t.equals(dat.repos.length, 0, 'has zero repos before adding')
  dat.add(null, function (repo) {
    t.equals(dat.repos.length, 1, 'has one repo after adding')
    t.ok(repo.key, 'repo ready and has a key')
    t.equals(repo.key.length, 32, 'has key with proper length')
    t.equals(repo.archive.key, repo.key, 'key is the archive key')
    t.equals(repo.discoverykey && repo.discoveryKey.length, 32, 'discovery key is there')
    dat.add(repo.key, function (other) {
      t.ok(repo, 'other repo ready')
      t.equals(other.key, repo.key, 'keys match')
      other.close()
      dat.swarm.close()
      repo.close()
    })
  })
  dat.on('repo', function (repo) {
    t.ok(repo, 'emits the repo event')
    t.equals(repo.key.length, 32, 'repo key is there')
  })
})
