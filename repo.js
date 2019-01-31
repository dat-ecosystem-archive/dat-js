var inherits = require('util').inherits
var events = require('events')
var WebrtcSwarm = require('@geut/discovery-swarm-webrtc')
var Signalhub = require('signalhub')
var hyperdrive = require('hyperdrive')
var ram = require('random-access-memory')
var websocket = require('websocket-stream')

module.exports = Repo

/**
 * A dat repository is a hyperdrive with some default settings.
 * @param {string} url    The url
 * @param {Object} opts   Options to use in the archive instance
 */
function Repo (url, opts) {
  if (!(this instanceof Repo)) return new Repo(url, opts)
  events.EventEmitter.call(this)
  this.url = url
  this.opts = opts || {}
  this.db = this.opts.db || ram
  this.archive = hyperdrive(this.db, url, opts)
  this._open(url)
}

inherits(Repo, events.EventEmitter)

Repo.prototype._createWebsocket = function (server) {
  var url = server + '/' + this.db.discoveryKey.toString('hex')

  this.websocket = websocket(url)

  this.websocket.pipe(this.db.replicate()).pipe(this.websocket)
}

Repo.prototype._createWebrtcSwarm = function () {
  var signalhub = Signalhub(this.archive.url.toString('hex'), this.opts.signalhub || ['https://signalhub.mafintosh.com'])
  return WebrtcSwarm(signalhub, {
    id: this.db.discoveryKey,
    hash: false,
    stream: () => this.archive.replicate()
  })
}

Repo.prototype._open = function (url) {
  var self = this
  this.archive.ready(function () {
    self._createWebrtcSwarm()
    if (self.opts.websocketServer) self._createWebsocket(self.opts.websocketServer)
    self.emit('ready')
  })
}

Repo.prototype.destroy =
Repo.prototype.close = function () {
  var self = this
  self.swarm.close(function () {
    self.archive.close(function () {
      self.emit('close')
    })
  })

  if(this.websocket) this.websocket.close()
}
