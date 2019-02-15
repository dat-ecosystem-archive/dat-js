const EventEmitter = require('events').EventEmitter
const Signalhub = require('signalhubws')
const hyperdrive = require('hyperdrive')
const ram = require('random-access-memory')
const websocket = require('websocket-stream')
const WebrtcSwarm = require('webrtc-swarm')
const pump = require('pump')

const DEFAULT_WEBSOCKET_RECONNECT = 1000
const DAT_PROTOCOL = 'dat://'

const DEFAULT_SIGNALHUBS = ['ws://gateway.mauve.moe:3300']

module.exports =

/**
 * A dat repository is a hyperdrive with some default settings.
 * @param {string} url    The url
 * @param {Object} opts   Options to use in the archive instance
 */
class Repo extends EventEmitter {
  constructor (url, opts) {
    if(!opts) throw new TypeError('Repo must have optsions passed in from `Dat` instance')
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
    this.opts = opts
    this.db = this.opts.db || ram
    this.archive = hyperdrive(this.db, key, opts)
    this._isReady = false

    this.signalhub = null
    this.swarm = null
    this.websocket = null

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

    this._replicate(this.websocket)
  }

  _joinWebrtcSwarm () {
    // TODO: Detect whether the page is HTTPS or not in order to set the protocol
    const signalhub = Signalhub(this.archive.discoveryKey.toString('hex').slice(20), this.opts.signalhub || DEFAULT_SIGNALHUBS)

    this.signalhub = signalhub

    const swarm = new WebrtcSwarm(signalhub, {
      // uuid: this.opts.id.toString('hex')
    })

    this.swarm = swarm

    swarm.on('peer', (stream) => this._replicate(stream))
  }

  _replicate (stream) {
    pump(stream, this.archive.replicate({
      sparse: true,
      live: true
    }), stream)
  }

  _open () {
    this.archive.ready(() => {
      this._joinWebrtcSwarm()
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

    // Close the gateway socket if one exists
    if (this.websocket) {
      this.websocket.end()
      this.websocket = null
    }

    // Stop accepting new WebRTC peers
    this.swarm.close(() => {
      // Disconnect from the signalhub
      this.signalhub.close(() => {
        // Close the DB files being used by hyperdrive
        this.archive.close(() => {
          this.emit('close')
        })
      })
    })
  }

  destroy (cb) {
    this.close(cb)
  }
}
