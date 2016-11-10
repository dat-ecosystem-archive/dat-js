var Repo = require('../repo')
var Dat = require('..')
var test = require('tape')

test('create a dat in memory', function (t) {
  t.plan(7)
  var dat = new Dat()
  t.equals(dat.repos.length, 0, 'has zero repos before adding')
  dat.add(function (repo) {
    t.equals(dat.repos.length, 1, 'has one repo after adding')
    t.ok(repo.key, 'repo ready and has a key')
    t.equals(repo.key.length, 32, 'has key with proper length')
    t.equals(repo.archive.key, repo.key, 'key is the archive key')
    repo.on('close', function () {
    })
  })
  dat.on('repo', function (repo) {
    t.ok(repo, 'emits the repo event')
    t.equals(repo.key.length, 32, 'repo key is there')
    dat.close()
  })
  dat.on('close', function () {
    t.end()
  })
})

test('replicate a dat in memory', function (t) {
  t.plan(5)
  var dat = new Dat()
  var clone = new Dat()

  t.equals(dat.repos.length, 0, 'has zero repos before adding')
  dat.add(null, function (repo) {
    t.equals(dat.repos.length, 1, 'has one repo after adding')
    t.equals(clone.repos.length, 0, 'has zero repos before adding in clone')
    clone.add(repo.key, function (other) {
      t.equals(repo.key, other.key, 'keys match')
      t.equals(clone.repos.length, 1, 'has one repo in clone')
      clone.close()
      dat.close()
    })
  })
  dat.on('close', function () {
    t.end()
  })
})
