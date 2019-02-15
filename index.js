const inherits = require('util').inherits
const xtend = require('xtend')
const EventEmitter = require('events').EventEmitter
var sodium = require('sodium-universal')
var bufferAlloc = require('buffer-alloc-unsafe')

const Repo = require('./repo')

module.exports =

/**
 * The Dat object. Manages multiple repositories in
 * a single discovery-swarm instance.
 * @param {Object} opts   Default options to use for the dat.
 */
class Dat extends EventEmitter {
  constructor (opts) {
    super()
    this.opts = opts || {}

    if(!this.opts.id) this.opts.id = randomBytes(32)

    this.repos = []
  }

  /**
   * Returns a repo with the given url. Returns undefined
   * if no repository is found with that url.
   * @param  {url} url      The url of the repo.
   * @return {Repo|undefined}  The repo object with the corresponding url.
   */
  get (url) {
    const repo = this.repos.find((repo) => repo.url === url)
    if (repo) return repo
    return this.add(url)
  }

  /**
   * Adds a new dat. Emits a 'repo' event when the undelying archive
   * instance is open.
   * @param {string}   url   The url to the dat.
   * @param {object}   opts  Options to use when building the dat.
   */
  add (url, opts) {
    const self = this
    if (self.destroyed) throw new Error('client is destroyed')
    if (!opts) opts = {}

    const repo = new Repo(url, xtend(this.opts, opts))
    self.repos.push(repo)

    repo.ready(() => {
      this.emit('repo', repo)
    })

    return repo
  }

  /**
   * Closes the dat, the swarm, and all underlying repo instances.
   */
  close (cb) {
    this.destroyed = true

    if(cb) this.once('close', cb)

    while (this.repos.length) {
      const repo = this.repos.pop()
      repo.close()
    }

    this.emit('close')
  }

  destroy (cb) {
    this.close(cb)
  }
}

// Based on code from hypercore-protocol https://github.com/mafintosh/hypercore-protocol/blob/master/index.js#L502
function randomBytes (n) {
  var buf = bufferAlloc(n)
  sodium.randombytes_buf(buf)
  return buf
}
