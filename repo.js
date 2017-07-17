var inherits = require('util').inherits
var pump = require('pump')
var events = require('events')
var swarm = require('webrtc-swarm')
var Signalhub = require('signalhub')
var hyperdrive = require('hyperdrive')
var ram = require('random-access-memory')

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
  this.db = this.opts.db || ram
  this.archive = hyperdrive(this.db, key, opts)
  this._open(key)
}

inherits(Repo, events.EventEmitter)

Repo.prototype._open = function () {
  var self = this
  this.archive.ready(function () {
    var signalhub = Signalhub('dat-' + self.archive.key.toString('hex'), self.opts.signalhub || 'https://signalhub.mafintosh.com')
    self.key = self.archive.key.toString('hex')
    self.swarm = self.swarm || swarm(signalhub)
    self.join()
    self.emit('ready')
  })
}

/**
 * Joins the swarm for the given repo.
 * @param  {Repo}   repo
 */
Repo.prototype.join =
Repo.prototype.resume = function () {
  this.swarm.on('peer', this._replicate.bind(this))
}

/**
 * Internal function for replicating the archive to the swarm
 * @param  {[type]} peer A webrtc-swarm peer
 */
Repo.prototype._replicate = function (conn) {
  var peer = this.archive.replicate({
    upload: true,
    download: true
  })
  pump(conn, peer, conn)
}

/**
 * Leaves the swarm for the given repo.
 * @param  {Repo}   repo
 */
Repo.prototype.leave =
Repo.prototype.pause = function () {
  this.swarm.removeListener('peer', this._replicate)
}

Repo.prototype.destroy =
Repo.prototype.close = function () {
  var self = this
  self.swarm.close(function () {
    self.archive.close(function () {
      self.emit('close')
    })
  })
}
