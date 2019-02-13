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
    return repo.url = url
  })
  if (repos.length) return repos[0]
  return this.add(url)
}

/**
 * Adds a new dat. Emits a 'repo' event when the undelying archive
 * instance is open.
 * @param {string}   url   The url to the dat.
 * @param {object}   opts  Options to use when building the dat.
 */
Dat.prototype.add = function (url, opts) {
  var self = this
  if (self.destroyed) throw new Error('client is destroyed')
  if (!opts) opts = {}

  var repo = new Repo(url, xtend(this.opts, opts))
  self.repos.push(repo)

  setTimeout(() => {
    this.emit('repo', repo)
  }, 0)
  return repo
}

/**
 * Closes the dat, the swarm, and all underlying repo instances.
 */
Dat.prototype.destroy =
Dat.prototype.close = function (cb) {
  if(cb) this.once('close', cb)

  while (this.repos.length) {
    var repo = this.repos.pop()
    repo.close()
  }
  this.destroyed = true
  this.emit('close')
}
