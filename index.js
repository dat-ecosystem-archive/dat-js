const xtend = require('xtend')
const EventEmitter = require('events').EventEmitter
const sodium = require('sodium-universal')
const bufferAlloc = require('buffer-alloc-unsafe')
const parallel = require('run-parallel')

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
    if (this.destroyed) throw new Error('client is destroyed')
    if (!opts) opts = {}

    const repo = new Repo(url, xtend(this.opts, opts))
    this.repos.push(repo)

    repo.ready(() => {
      this.emit('repo', repo)
    })

    return repo
  }

  create (opts) {
    return this.add(null, opts)
  }

  has (url) {
    return !!this.repos.find((repo) => repo.url === url)
  }

  /**
   * Closes the dat, the swarm, and all underlying repo instances.
   */
  close (cb) {
    if(this.destroyed) {
      if(cb) process.nextTick(cb)
      return
    }
    this.destroyed = true

    if(cb) this.once('close', cb)

    parallel(this.repos.map((repo) => {
      return (cb) => {
        repo.close(cb)
      }
    }), (err) => {
      this.repos = []
      this.emit('close')
    })
  }

  destroy (cb) {
    this.close(cb)
  }
}

// Based on code from hypercore-protocol https://github.com/mafintosh/hypercore-protocol/blob/master/index.js#L502
function randomBytes (n) {
  const buf = bufferAlloc(n)
  sodium.randombytes_buf(buf)
  return buf
}
