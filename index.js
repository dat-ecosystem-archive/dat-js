const inherits = require('util').inherits
const xtend = require('xtend')
const EventEmitter = require('events').EventEmitter

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
    this.repos = []
  }

  /**
   * Returns a repo with the given url. Returns undefined
   * if no repository is found with that url.
   * @param  {url} url      The url of the repo.
   * @return {Repo|undefined}  The repo object with the corresponding url.
   */
  get (url) {
    const repos = this.repos.filter((repo) => repo.url === url)
    if (repos.length) return repos[0]
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

    setTimeout(() => {
      this.emit('repo', repo)
    }, 0)

    return repo
  }

  /**
   * Closes the dat, the swarm, and all underlying repo instances.
   */
  close (cb) {
    if(cb) this.once('close', cb)

    while (this.repos.length) {
      const repo = this.repos.pop()
      repo.close()
    }

    this.destroyed = true
    this.emit('close')
  }

  destroy (cb) {
    this.close(cb)
  }
}
