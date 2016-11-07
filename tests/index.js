var Repo = require('../repo')
var Dat = require('..')
var test = require('tape')
var log = require('why-is-node-running')

test('create a dat in memory', function (t) {
  t.plan(8)
  var dat = new Dat()
  t.ok(dat.swarm, 'has a swarm object')
  t.equals(dat.repos.length, 0, 'has zero repos before adding')
  dat.add(null, function (repo) {
    t.equals(dat.repos.length, 1, 'has one repo after adding')
    t.ok(repo.key, 'repo ready and has a key')
    t.equals(repo.key.length, 32, 'has key with proper length')
    t.equals(repo.archive.key, repo.key, 'key is the archive key')
    dat.close()
  })
  dat.on('repo', function (repo) {
    t.ok(repo, 'emits the repo event')
    t.equals(repo.key.length, 32, 'repo key is there')
  })
})

test('replicate a dat in memory', function (t) {
  t.plan(8)
  var dat = new Dat()
  var clone = new Dat()

  t.equals(dat.repos.length, 0, 'has zero repos before adding')
  dat.add(null, function (repo) {
    t.equals(dat.repos.length, 1, 'has one repo after adding')
    t.equals(clone.repos.length, 0, 'has zero repos before adding')
    clone.add(repo.key, function (repo) {
      t.equals(clone.repos.length, 2, 'has two repos after adding')
      clone.close()
      dat.close()
    })
  })

  clone.on('repo', function (repo) {
    t.ok(repo, 'emits the repo event')
    t.equals(repo.key.length, 32, 'repo key is there')
  })
})
