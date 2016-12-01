var inherits = require('util').inherits
var events = require('events')
var swarm = require('hyperdiscovery')
var hyperdrive = require('hyperdrive')
var memdb = require('memdb')

module.exports = Repo

/**
 * A dat repository is a hyperdrive with some default settings.
 * @param {string} key    The key
 * @param {Object} opts   Options to use in the archive instance
 */
function Repo (key, opts) {
  if (!(this instanceof Repo)) return new Repo(key, opts)
  var self = this
  events.EventEmitter.call(this)
  this.opts = opts || {}
  this.db = this.opts.db || memdb()
  this.drive = hyperdrive(this.db)
  this.archive = this.drive.createArchive(key, this.opts)
  this.key = this.archive.key
  this.privateKey = this.archive.privateKey
  this.swarm = this.swarm || swarm(this.archive, this.opts)
  self.join()
  this._open(key)
}

inherits(Repo, events.EventEmitter)

Repo.prototype._open = function () {
  var self = this
  this.archive.open(function () {
    self.emit('ready')
  })
}

/**
 * Joins the swarm for the given repo.
 * @param  {Repo}   repo
 */
Repo.prototype.join =
Repo.prototype.resume = function () {
  this.swarm.join(this.archive.discoveryKey)
}

/**
 * Leaves the swarm for the given repo.
 * @param  {Repo}   repo
 */
Repo.prototype.leave =
Repo.prototype.pause = function () {
  this.swarm.leave(this.archive.discoveryKey)
}

Repo.prototype.destroy =
Repo.prototype.close = function () {
  var self = this
  self.swarm.destroy(function () {
    self.archive.close(function () {
      self.db.close(function () {
        self.emit('close')
      })
    })
  })
}
