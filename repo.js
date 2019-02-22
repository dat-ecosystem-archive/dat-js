/* global self */
const EventEmitter = require('events').EventEmitter
const Signalhub = require('signalhubws')
const hyperdrive = require('hyperdrive')
const ram = require('random-access-memory')
const websocket = require('websocket-stream')
const WebrtcSwarm = require('webrtc-swarm')
const pump = require('pump')
const through = require('through2')
const encoding = require('dat-encoding')
const xtend = require('xtend')
const crypto = require('hypercore-crypto')

const DEFAULT_WEBSOCKET_RECONNECT = 1000
const DEFAULT_WEBSOCKET_CONNECTION_DELAY = 1000
const DEFAULT_WEBSOCKET_CONNECTION_DELAY_LONG = 5000
const DAT_PROTOCOL = 'dat://'

const DEFAULT_SIGNALHUBS = ['wss://signalhubws.mauve.moe']

// Check if the page was loaded from HTTPS
const IS_SECURE = self.location.href.startsWith('https')

module.exports =

class Repo extends EventEmitter {
  /**
  * A dat repository is a hyperdrive with some default settings.
  * @param {string} url    The url
  * @param {Object} opts   Options to use in the archive instance
  */
  constructor (key, opts) {
    if (!opts) throw new TypeError('Repo must have options passed in from `Dat` instance')
    super()

    // If no key was provided, generate one
    if(!key) {
      const keyPair = crypto.keyPair()
      key = keyPair.publicKey
      opts.secretKey = keyPair.secretKey
    }

    this.url = DAT_PROTOCOL + encoding.encode(key)
    this.opts = opts
    this.db = (file) => {
      const db = this.opts.db || ram
      return db(this.url.slice(DAT_PROTOCOL.length) + '/' + file)
    }
    this.archive = hyperdrive(this.db, key, xtend({
      sparse: true
    }, opts))
    this.isReady = false

    this.signalhub = null
    this.swarm = null
    this.websocket = null
    this._websocketTimer = null

    this._open()
  }

  // Attempt to create a websocket connection to a gateway if possible
  _createWebsocket () {
    if (!this.opts.gateway) return
    const servers = [].concat(this.opts.gateway)

    if (!servers.length) return

    const server = chooseRandom(servers)

    const url = setSecure(server + '/' + this.archive.key.toString('hex'))

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
    const hubs = [].concat(this.opts.signalhub || DEFAULT_SIGNALHUBS).map(setSecure)

    const appName = this.archive.discoveryKey.toString('hex').slice(40)

    const signalhub = new Signalhub(appName, hubs)

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
        subscription.destroy()
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
      this.isReady = true
      this.emit('ready')
    })
  }

  ready (cb) {
    if (this.isReady) {
      process.nextTick(cb)
    }
    this.once('ready', cb)
  }

  close (cb) {
    if (this.destroyed) {
      if (cb) process.nextTick(cb)
      return
    }
    this.destroyed = true
    if (cb) this.once('close', cb)

    // Close the gateway socket if one exists
    if (this.websocket) {
      this.websocket.end()
      this.websocket = null
    }

    // Disconnect from the signalhub
    this.signalhub.close(() => {
      // Disconnect from WebRTC peers
      this.swarm.close(() => {
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

// Convert URLs to be HTTPS or not based on whether the page is
function setSecure (url) {
  if (IS_SECURE) {
    if (url.startsWith('http:')) {
      return 'https:' + url.slice(6)
    } else if (url.startsWith('ws:')) {
      return 'wss:' + url.slice(3)
    } else {
      return url
    }
  } else {
    if (url.startsWith('https:')) {
      return 'http:' + url.slice(7)
    } else if (url.startsWith('wss:')) {
      return 'ws:' + url.slice(4)
    } else {
      return url
    }
  }
}

function chooseRandom (list) {
  return list[Math.floor(Math.random() * list.length)]
}
