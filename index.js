const EventEmitter = require('events').EventEmitter
const parallel = require('run-parallel')
const encoding = require('dat-encoding')
const RAW = require('random-access-web')
const RAM = require('random-access-memory')
const DiscoverySwarmWeb = require('discovery-swarm-web')
const crypto = require('hypercore-crypto')
const hypercoreProtocol = require('hypercore-protocol')
const hyperdrive = require('hyperdrive')

const DAT_PROTOCOL = 'dat://'
const STORAGE_NAME = 'dats'
const STORAGE_COLLECTION_NAME = `files`

module.exports =

/**
 * The Dat object. Manages multiple archives in
 * a single discovery-swarm-web instance.
 * @param {Object} opts   Default options to use for the dat.
 */
class Dat extends EventEmitter {
  constructor (opts) {
    super()
    this.opts = opts || {}

    if (!this.opts.id) this.opts.id = crypto.randomBytes(32)

    this.archives = []

    const discoveryOpts = Object.assign({
      stream: (info) => this._replicate(info)
    }, this.opts)
    this.swarm = DiscoverySwarmWeb(discoveryOpts)

    const storageOpts = Object.assign({
      name: STORAGE_NAME,
      storeName: STORAGE_COLLECTION_NAME
    }, this.opts)
    this.persistence = RAW(storageOpts)
  }

  /**
   * Returns a archive with the given url.
   * @param  {url} url      The url of the archive.
   * @return {hyperdrive}  The archive object with the corresponding url.
   */
  get (url, opts) {
    const key = encoding.decode(url)
    const normalizedURL = `dat://${encoding.encode(key)}`
    const archive = this.archives.find((archive) => archive.url === normalizedURL)
    if (archive) return archive
    return this._add(normalizedURL, opts)
  }

  _add (url, opts) {
    if (this.destroyed) throw new Error('client is destroyed')
    if (!opts) opts = {}
    const finalOpts = Object.assign({}, this.opts, opts)

    let key = null

    if (url) key = encoding.decode(url)

    // If no key was provided, generate one
    if (!key) {
      const keyPair = crypto.keyPair()
      key = keyPair.publicKey
      finalOpts.secretKey = keyPair.secretKey
    }

    const keyString = encoding.encode(key)

    const rawStorage = finalOpts.db || (finalOpts.persist ? this.persistence : RAM)
    const storage = (file) => {
      return rawStorage(keyString + '/' + file)
    }
    const archive = hyperdrive(storage, key, Object.assign({
      sparse: true
    }, finalOpts))

    archive.url = DAT_PROTOCOL + keyString

    this.archives.push(archive)

    archive.ready(() => {
      this.swarm.join(archive.discoveryKey)
      this.emit('archive', archive)
    })

    return archive
  }

  create (opts) {
    return this._add(null, opts)
  }

  has (url) {
    const key = encoding.decode(url)
    const normalizedURL = `dat://${encoding.encode(key)}`
    return !!this.archives.find((archive) => archive.url === normalizedURL)
  }

  _replicate (info) {
    var stream = hypercoreProtocol({
      id: this.opts.id,
      live: true,
      encrypt: true,
    })

    stream.on('feed', (discoveryKey) => this._replicateFeed(stream, discoveryKey))

    stream.on('error', (e) => {
      this.emit('replication-error', e)
    })

    if (info.channel) {
      this._replicateFeed(stream, info.channel)
    }

    return stream
  }

  _replicateFeed (stream, discoveryKey) {
    if (this.destroyed) {
      stream.end()
      return
    }
    const stringKey = encoding.encode(discoveryKey)
    const archive = this.archives.find((archive) => {
      return encoding.encode(archive.discoveryKey) === stringKey
    })

    if (!archive) return

    archive.replicate({ stream, live: true })
  }

  /**
   * Closes the the swarm, and all underlying hyperdrive instances.
   */
  close (cb) {
    if (this.destroyed) {
      if (cb) process.nextTick(cb)
      return
    }
    this.destroyed = true
    this.swarm.close()

    if (cb) this.once('close', cb)

    parallel(this.archives.map((archive) => {
      return (cb) => {
        archive.close(cb)
      }
    }), () => {
      this.archives = null
      this.emit('close')
    })
  }

  destroy (cb) {
    this.close(cb)
  }
}
