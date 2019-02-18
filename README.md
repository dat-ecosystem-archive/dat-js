# dat-js [![Travis](https://api.travis-ci.org/datproject/dat-js.svg)](https://travis-ci.org/datproject/dat-js)  [![NPM version](https://img.shields.io/npm/v/dat-js.svg?style=flat-square)](https://npmjs.org/package/dat)

A pure JavaScript browser-friendly api for using dat.

[Dat](http://datproject.org) is a powerful decentralized data sharing tool. For a Node.js api for working with dats on the filesystem, see [dat-node](http://github.com/datproject/dat-node).

Want to use Dat in the command line or an app (not build applications)? Check out:

* [Dat CLI](https://github.com/datproject/dat): Use Dat in the command line
* [Dat-Desktop](https://github.com/datproject/dat-desktop): A desktop application for Dat

#### Learn more! [docs.datproject.org](http://docs.datproject.org/) or [chat with us](https://gitter.im/datproject/discussions) ([#dat on IRC](http://webchat.freenode.net/?channels=dat))

## Example

#### Getting data from a remote dat

```js
var Dat = require('dat-js')

var dat = new Dat()
var repo = dat.get('dat://SOME_ARCHIVE_URL')

var readStream = repo.archive.readFile('hello.txt', (err, data) {
  console.log(data)
})
```

#### Replicating a dat in memory

```js
var Dat = require('dat-js')

var dat = new Dat()
var repo = dat.create()

// The URL will only be available after the `ready` event
repo.ready(() => {
  console.log('dat url is:', repo.url)
})

// You can start reading/writing before it's `ready`
var writer = repo.archive.createWriteStream('hello.txt')

writer.write('world')
writer.end(function () { replicate(repo.url) })

function replicate (url) {
  var clone = new Dat()
  var repo = clone.get(url)

  var readStream = repo.archive.createReadStream('hello.txt')
  readStream.on('data', function (data) {
    console.log(data.toString()) // prints 'world'
  })
}
```

#### Replication with a websocket gateway

```js
var Dat = require('dat-js')
var concat = require('concat-stream')
var pump = require('pump')

var dat = new Dat({
  gateway: 'ws://gateway.mauve.moe:3000'
})
var repo = dat.get('dat://SOME_ARCHIVE_URL')

var readStream = repo.archive.createReadStream('hello.txt')

pump(readStream, concat(function (data) {
  console.log(data)
}))
```

#### Persisting a created dat and loading it from storage

```js
var Dat = require('dat-js')
var db = require('random-access-idb')('dats')

var dat = new Dat()

var repo = dat.create({
  db: db
})

repo.archive.writeFile('/example.txt', 'Hello World!', () => {
  // Save it for later
  localStorage.setItem('My_Repo', repo.url)
})

// Next time your app loads

var repo = dat.get(localStorage.getItem('My_Repo'), {
  db: db
})

repo.archive.readFile('/example.txt', 'utf-8', (err, data) => {
  console.log(`It's still there: ${data}`)
})
```

## API

#### `var dat = new Dat([options])`

Creates a new dat object. The options passed here will be default for any dats created using the `add` method.

 * `options`: any options you can pass to [mafintosh/hyperdrive](https://github.com/mafintosh/hyperdrive). These options will become default for all dats. In addition it has the following:
  * `signalhub`: An optional string or array of strings for [signalhubws](https://github.com/soyuka/signalhubws) servers to use for WebRTC. Note that this isn't compatible with older `signalhub` servers. These servers are used to discover and connect to WebRTC peers.
  * `gateway`: An optional string or array of strings for [dat-gateway](https://github.com/garbados/dat-gateway/) instances for websocket replication. This is used to proxy data from the rest of the dat network when there are no WebRTC peers available with your data.

### `dat.get(url, [options])`

Adds a new dat with the given url. Joins the appropriate swarm for that url and begins to upload and download data. If the dat was already added, it will return the existing instance.

 * `url`: Either a `dat://` url or just the public key in string form.
 * `options`: These options will override any options given in the Dat constructor.

### `dat.create([options])`

Creates a new dat, wait for it to be `ready` before trying to access the url.

* `options`: These options will override any options given in the Dat constructor.

### `dat.has(url)`

Returns whether a given url has been loaded already.

### Properties

#### `dat.repos`

Array of repo instances

### Repo

The repo object managed by dat.

#### `repo.url`

The `dat://` url of the repo. Note that for newly created repos, you must wait for it to be `ready`.

### `rep.ready(cb)`

Invokes the `cb` once the repo is fully initialized. You can do reads and writes from the archive before then, but this is important if you're creating a new archive. If the repo is already `ready`, it will invoke `cb` on the next tick.

#### `repo.destroy()`

Destroys the swarm and underlying database.

#### `repo.swarm`

Get to the original `webrtc-swarm` instance, where the swarm can be managed.

#### `repo.archive`

Get to the original `hyperdrive` archive instance, where files can be managed using that api.

### Events

#### `repo`

Fired every time a new repo is ready.

#### `close`

Fired when dat is finished closing, including swarm and database.
