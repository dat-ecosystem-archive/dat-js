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
  var url = server + '/' + this.archive.key.toString('hex')

  this.websocket = websocket(url)

  this.websocket.pipe(this.archive.replicate({
    sparse: true,
    live: true
  })).pipe(this.websocket)
}

Repo.prototype._createWebrtcSwarm = function () {
  // TODO: Detect whether the page is HTTPS or not in order to set the protocol
  // I had to set it to HTTP temporarily so that it would work on localhost on Firefox
  var signalhub = Signalhub(this.archive.key.toString('hex'), this.opts.signalhub || ['http://signalhub.mafintosh.com'])
  var swarm = WebrtcSwarm({

    // TODO: Check that this is a good value to have for the id
    id: this.db.discoveryKey,
    hash: false,
    stream: () => this.archive.replicate()
  })

  swarm.join(signalhub)

  return swarm
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
