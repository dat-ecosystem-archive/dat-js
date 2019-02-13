var inherits = require('util').inherits
var events = require('events')
var WebrtcSwarm = require('@geut/discovery-swarm-webrtc')
var Signalhub = require('signalhub')
var hyperdrive = require('hyperdrive')
var ram = require('random-access-memory')
var websocket = require('websocket-stream')

var DEFAULT_WEBSOCKET_RECONNECT = 1000
var DAT_PROTOCOL = 'dat://'

var DEFAULT_SIGNALHUBS = ['http://gateway.mauve.moe:3463']

module.exports = Repo

/**
 * A dat repository is a hyperdrive with some default settings.
 * @param {string} url    The url
 * @param {Object} opts   Options to use in the archive instance
 */
function Repo (url, opts) {
  if (!(this instanceof Repo)) return new Repo(url, opts)
  events.EventEmitter.call(this)

  var key = null;
  if(url) {
    if(url.indexOf(DAT_PROTOCOL) === 0) {
      key = url.slice(DAT_PROTOCOL.length)
    } else {
      key = url
      url = DAT_PROTOCOL + key
    }
  }

  this.url = url
  this.opts = opts || {}
  this.db = this.opts.db || ram
  this.archive = hyperdrive(this.db, key, opts)
  this._isReady = false

  if(!url) {
    this.ready(() => {
      var url = 'dat://' + this.archive.key.toString('hex')
      this.url = url
    })
  }

  this._open()
}

inherits(Repo, events.EventEmitter)

Repo.prototype._createWebsocket = function (server) {
  var url = server + '/' + this.archive.key.toString('hex')

  this.websocket = websocket(url)

  this.websocket.once('error', () => {
    setTimeout(() => {
      this._createWebsocket(server)
    }, this.opts.websocketReconnectDelay || DEFAULT_WEBSOCKET_RECONNECT)
  })

  this.websocket.pipe(this.archive.replicate({
    sparse: true,
    live: true
  })).pipe(this.websocket)
}

Repo.prototype._createWebrtcSwarm = function () {
  // TODO: Detect whether the page is HTTPS or not in order to set the protocol
  var signalhub = Signalhub(this.archive.key.toString('hex'), this.opts.signalhub || DEFAULT_SIGNALHUBS)
  var swarm = WebrtcSwarm({
    hash: false,
    stream: () => this.archive.replicate()
  })

  this.swarm = swarm

  swarm.join(signalhub)

  return swarm
}

Repo.prototype._open = function () {
  var self = this
  this.archive.ready(function () {
    self._createWebrtcSwarm()
    if (self.opts.websocketServer) self._createWebsocket(self.opts.websocketServer)
    self._isReady = true
    self.emit('ready')
  })
}

Repo.prototype.ready = function(cb) {
  if(this._isReady) {
    setTimeout(cb, 0)
  }
  this.once('ready', cb)
}

Repo.prototype.destroy =
Repo.prototype.close = function (cb) {
  var self = this

  if(cb) this.once('close', cb)

  for (let channel of self.swarm.channels.values()) {
    channel.swarm.close()
  }

  if (this.websocket) {
    this.websocket.end()
    this.websocket = null
  }

  self.archive.close(function () {
    self.emit('close')
  })
}
