const inherits = require('util').inherits
const EventEmitter = require('events').EventEmitter
const WebrtcSwarm = require('@geut/discovery-swarm-webrtc')
const Signalhub = require('signalhub')
const hyperdrive = require('hyperdrive')
const ram = require('random-access-memory')
const websocket = require('websocket-stream')

const DEFAULT_WEBSOCKET_RECONNECT = 1000
const DAT_PROTOCOL = 'dat://'

const DEFAULT_SIGNALHUBS = ['http://gateway.mauve.moe:3463']

module.exports =

/**
 * A dat repository is a hyperdrive with some default settings.
 * @param {string} url    The url
 * @param {Object} opts   Options to use in the archive instance
 */
class Repo extends EventEmitter {
  constructor (url, opts) {
    super()
    let key = null;
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
        const url = 'dat://' + this.archive.key.toString('hex')
        this.url = url
      })
    }

    this._open()
  }

  _createWebsocket (server) {
    const url = server + '/' + this.archive.key.toString('hex')

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

  _createWebrtcSwarm () {
    // TODO: Detect whether the page is HTTPS or not in order to set the protocol
    const signalhub = Signalhub(this.archive.key.toString('hex'), this.opts.signalhub || DEFAULT_SIGNALHUBS)
    const swarm = WebrtcSwarm({
      hash: false,
      stream: () => this.archive.replicate()
    })

    this.swarm = swarm

    swarm.join(signalhub)

    return swarm
  }

  _open () {
    this.archive.ready(() => {
      this._createWebrtcSwarm()
      if (this.opts.websocketServer) this._createWebsocket(this.opts.websocketServer)
      this._isReady = true
      this.emit('ready')
    })
  }

  ready (cb) {
    if(this._isReady) {
      setTimeout(cb, 0)
    }
    this.once('ready', cb)
  }

  close (cb) {
    if(cb) this.once('close', cb)

    if (this.websocket) {
      this.websocket.end()
      this.websocket = null
    }

    this.swarm.close(() => {
      this.archive.close(() => {
        this.emit('close')
      })
    })
  }

  destroy (cb) {
    this.close(cb)
  }
}
