var inherits = require('util').inherits
var events = require('events')
var swarm = require('discovery-swarm')
var defaults = require('datland-swarm-defaults')
var hyperImport = require('hyperdrive-import-files')

var Repo = require('./repo')

module.exports = Dat

/**
 * The Dat object. Manages multiple repositories in
 * a single discovery-swarm instance.
 * @param {Object} opts   Default options to use for the dat.
 */
function Dat (opts) {
  if (!(this instanceof Dat)) return new Dat(opts)
  events.EventEmitter.call(this)
  var self = this
  this.opts = opts || {}
  this.repos = []
  this.swarm = swarm(defaults({
    hash: false,
    stream: function (info) {
      var archive = self.get(info.channel)
      console.log('archive', info.channel)
      if (archive) return archive.replicate()
      else console.error('archive not found', key)
    }
  }))

  this.swarm.listen(3282)
  this.swarm.once('error', function () {
    self.swarm.listen(0)
  })
}

inherits(Dat, events.EventEmitter)

/**
 * Returns a repo with the given key. Returns undefined
 * if no repository is found with that key.
 * @param  {string} key      The key of the repo.
 * @return {Repo|undefined}  The repo object with the corresponding key.
 */
Dat.prototype.get = function (key) {
  return repos.filter(function () {
    return key.toString('hex') === repo.key.toString('hex')
  })[0]
}

/**
 * Adds a new dat. Emits a 'repo' event when the undelying archive
 * instance is open.
 * @param {string}   key   The key to the dat.
 * @param {object}   opts  Options to use when building the dat.
 * @param {Function} cb    The callback with the repo object (optional).
 */
Dat.prototype.add = function (key, opts, cb) {
  var self = this
  if (self.destroyed) throw new Error('client is destroyed')
  if (typeof opts === 'function') return self.add(key, null, opts)
  if (typeof key === 'function') return self.add(null, null, key)
  if (!opts) opts = {}

  var repo = new Repo(key, opts)
  self.repos.push(repo)
  self.join(repo)

  repo.once('ready', onready)
  repo.once('close', onclose)

  function onready () {
    if (self.destroyed) return
    if (typeof cb === 'function') cb(repo)
    self.emit('repo', repo)
  }

  function onclose () {
    repo.removeListener('ready', onready)
    repo.removeListener('close', onclose)
  }
}

/**
 * Joins the swarm for the given repo.
 * @param  {Repo}   repo
 */
Dat.prototype.join = function (repo) {
  this.swarm.join(repo.archive.discoveryKey)
}

/**
 * Leaves the swarm for the given repo.
 * @param  {Repo}   repo
 */
Dat.prototype.leave = function (repo) {
  this.swarm.leave(repo.archive.discoveryKey)
}

/**
 * Begins watching a given directory and adds the files to the
 * repository as files are added, modified, or deleted.
 * @param  {string}   dir   The dir to begin watching.
 * @param  {Repo}     repo  The repo to add it to.
 */
Dat.prototype.watch = function (dir, repo, opts) {
  var self = this
  this.importer = hyperImport(repo.archive, dir, {
    live: opts.live || self.opts.live,
    resume: opts.resume || self.opts.resume,
    ignore: opts.ignore || self.opts.ignore
  }, cb)
  return this.importer
}

/**
 * Closes the dat, the swarm, and all underlying repo instances.
 */
Dat.prototype.close = function () {
  this.swarm.close()
  while (this.repos.length) {
    var repo = this.repos.pop()
    repo.close()
  }
  this.destroyed = true
}
