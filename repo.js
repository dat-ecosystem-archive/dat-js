var inherits = require('util').inherits
var events = require('events')
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
  console.log('key', key)
  this.archive = this.drive.createArchive(key, this.opts)
  this.key = this.archive.key
  this._open(key)
}

inherits(Repo, events.EventEmitter)

Repo.prototype._open = function () {
  var self = this
  this.archive.open(function () {
    self.emit('ready')
  })
}

Repo.prototype.close = function (cb) {
  var self = this
  self.archive.close(function () {
    self.db.close(function () {
      self.emit('close')
    })
  })
}
