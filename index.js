var inherits = require('util').inherits
var xtend = require('xtend')
var events = require('events')

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
  this.opts = opts || {}
  this.repos = []
}

inherits(Dat, events.EventEmitter)

/**
 * Returns a repo with the given url. Returns undefined
 * if no repository is found with that url.
 * @param  {url} url      The url of the repo.
 * @return {Repo|undefined}  The repo object with the corresponding url.
 */
Dat.prototype.get = function (url) {
  var repos = this.repos.filter(function (repo) {
    return url.toString('hex') === repo.url.toString('hex')
  })
  if (repos.length) return repos[0]
  return this.add(url)
}

/**
 * Adds a new dat. Emits a 'repo' event when the undelying archive
 * instance is open.
 * @param {string}   url   The url to the dat.
 * @param {object}   opts  Options to use when building the dat.
 * @param {Function} cb    The callback with the repo object (optional).
 */
Dat.prototype.add = function (url, opts) {
  var self = this
  if (self.destroyed) throw new Error('client is destroyed')
  if (typeof opts === 'function') return self.add(url, null, opts)
  if (typeof url === 'function') return self.add(null, null, url)
  if (!opts) opts = {}

  var repo = new Repo(url, xtend(this.opts, opts))
  self.repos.push(repo)
  return repo
}

/**
 * Closes the dat, the swarm, and all underlying repo instances.
 */
Dat.prototype.destroy =
Dat.prototype.close = function () {
  while (this.repos.length) {
    var repo = this.repos.pop()
    repo.close()
  }
  this.destroyed = true
  this.emit('close')
}
