const inherits = require('util').inherits
const EventEmitter = require('events').EventEmitter
const Signalhub = require('signalhub')
const hyperdrive = require('hyperdrive')
const ram = require('random-access-memory')
const websocket = require('websocket-stream')
const WebrtcSwarm = require('webrtc-swarm')
const pump = require('pump')
var through = require('through2')

const DEFAULT_WEBSOCKET_RECONNECT = 1000
const DEFAULT_WEBSOCKET_CONNECTION_DELAY = 1000
const DEFAULT_WEBSOCKET_CONNECTION_DELAY_LONG = 5000
const DAT_PROTOCOL = 'dat://'

const DEFAULT_SIGNALHUBS = ['http://gateway.mauve.moe:3463']

module.exports =

class Repo extends EventEmitter {
  /**
  * A dat repository is a hyperdrive with some default settings.
  * @param {string} url    The url
  * @param {Object} opts   Options to use in the archive instance
  */
  constructor (url, opts) {
    if(!opts) throw new TypeError('Repo must have optsions passed in from `Dat` instance')
    super()
    let key = null;

    // Make sure that the URL looks like `dat://somekey` if it exists
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
    this._websocketTimer = null

    // If no URL was provided, we should set it once the archive is ready
    if(!url) {
      this.ready(() => {
        const url = 'dat://' + this.archive.key.toString('hex')
        this.url = url
      })
    }

    this._open()
  }

  // Attempt to create a websocket connection to a gateway if possible
  _createWebsocket () {
    if(!this.opts.gateway) return
    const server = this.opts.gateway

    const url = server + '/' + this.archive.key.toString('hex')

    this.websocket = websocket(url)

    this.websocket.once('error', () => {
      setTimeout(() => {
        this._createWebsocket(server)
      }, DEFAULT_WEBSOCKET_RECONNECT)
    })

    this._replicate(this.websocket)
  }

  _startWebsocketTimer () {
    // Wait a second before trying to establish a connection to the gateway in case there's already WebRTC peers
    this._websocketTimer = setTimeout(() => {
      this._createWebsocket()
    }, DEFAULT_WEBSOCKET_CONNECTION_DELAY)
  }

  _joinWebrtcSwarm () {
    // TODO: Detect whether the page is HTTPS or not in order to set the protocol
    const hubs = [].concat(this.opts.signalhub || DEFAULT_SIGNALHUBS)

    const signalhub = Signalhub(this.archive.discoveryKey.toString('hex').slice(40), this.opts.signalhub || DEFAULT_SIGNALHUBS)

    this.signalhub = signalhub

    // Listen for incoming connections
    const subscription = signalhub.subscribe('all')
    const processSubscription = through.obj((data, enc, cb) => {
      if (data.from === swarm.me) {
        return cb()
      }
      if (data.type === 'connect') {
        // If we've gotten a connection request, delay websocket connection
        // This is to prioritize WebRTC traffic and reduce gateway load
        clearInterval(this._websocketTimer)
        this._websocketTimer = setTimeout(() => {
          this._createWebsocket()
        }, DEFAULT_WEBSOCKET_CONNECTION_DELAY_LONG)
        cb()
        // We did the thing so no need to listen any further
        subscription.end()
      }
    })

    subscription.pipe(processSubscription)

    const swarm = new WebrtcSwarm(signalhub)

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
      this._startWebsocketTimer()
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
