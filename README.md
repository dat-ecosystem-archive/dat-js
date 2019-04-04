# dat-js [![Travis](https://api.travis-ci.org/datproject/dat-js.svg)](https://travis-ci.org/datproject/dat-js)  [![NPM version](https://img.shields.io/npm/v/dat-js.svg?style=flat-square)](https://npmjs.org/package/dat)

A pure JavaScript browser-friendly api for using dat.

[Dat](http://datproject.org) is a powerful decentralized data sharing tool. For a Node.js api for working with dats on the filesystem, see [dat-node](http://github.com/datproject/dat-node).

Want to use Dat in the command line or an app (not build applications)? Check out:

* [Dat CLI](https://github.com/datproject/dat): Use Dat in the command line
* [Dat-Desktop](https://github.com/datproject/dat-desktop): A desktop application for Dat

#### Learn more! [docs.datproject.org](http://docs.datproject.org/) or [chat with us](https://gitter.im/datproject/discussions) ([#dat on IRC](http://webchat.freenode.net/?channels=dat))

## Example

#### Getting data from a remote dat

You can load a Dat archive using it's `read key`. Dat-js will reach out to the P2P network and start loading the metadata into memory. From there you can invoke [hyperdrive](https://www.npmjs.com/package/hyperdrive) methods to read the data.

```js
var Dat = require('dat-js')

var dat = new Dat()
var archive = dat.get('dat://SOME_ARCHIVE_URL')

archive.readFile('hello.txt', function (err, data) {
  console.log(data)
})

var readStream = archive.createReadStream('hello.txt')
readStream.on('data', console.log)
```

#### Persisting a created dat and loading it from storage

By default, when you create a new Dat archive with Dat-js, it will be erased after you refresh the page. In order to keep it around for the next time the user loads the page, you need to make sure to enable the `persist` flag, and save a copy of the `url` read key to someplace like [localStorage](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage).

```js
var Dat = require('dat-js')

var dat = new Dat()

var archive = dat.create({
  // Set this flag so that the data is persisted to the browser rather than memory
  persist: true
})

archive.writeFile('/example.txt', 'Hello World!', () => {
  // Save it for later
  localStorage.setItem('My_Repo', archive.url)
})

// OR as a stream:
var ws = archive.createWriteStream()
ws.write('Hello World!')
ws.end()

// Next time your app loads

var repo = dat.get(localStorage.getItem('My_Repo'), {
  persist: true
})

repo.archive.readFile('/example.txt', 'utf-8', (err, data) => {
  console.log(`It's still there: ${data}`)
})
```

## API

#### `var dat = new Dat([options])`

Creates a new dat object. The options passed here will be default for any dats created using the `add` method.

 * `options`: any options you can pass to [mafintosh/hyperdrive](https://github.com/mafintosh/hyperdrive). These options will become default for all dats. It also gets passed as options into [discovery-swarm-web](https://github.com/RangerMauve/discovery-swarm-web). In addition it has the following:
  * `persist`: Whether the data should persist locally or load in memory. Default: `false` (memory only). This uses [random-access-web](https://github.com/RangerMauve/random-access-web) for persistence to choose the best storage layer for the current browser.
  * `db`: Pass in the [random-access-storage](https://github.com/random-access-storage/random-access-storage) instance to use. (overrides the `persist` option)
  * `id`: The ID to use when replicating hyperdrives

### `dat.get(url, [options])`

Adds a new dat with the given url. Joins the appropriate swarm for that url and begins to upload and download data. If the dat was already added, it will return the existing instance. One gotcha is that dat-js doesn't support DNS resolution yet. As such you'll need to use the actual archive key for loading websites. `dat-js` adds a `url` field to the archive, which contains the [read key](https://docs.datproject.org/docs/concepts#distributed-network), but you can see the rest of the APIs available in the [hyperdrive](https://www.npmjs.com/package/hyperdrive) docs.

 * `url`: Either a `dat://` url or just the public key in string form.
 * `options`: These options will override any options given in the Dat constructor.

### `dat.create([options])`

Creates a new dat, wait for it to be `ready` before trying to access the url. Make sure to save the repo `url` somewhere and enable `persist: true` so you can access it again later!

* `options`: These options will override any options given in the Dat constructor.

### `dat.has(url)`

Returns whether a given url has been loaded already.

### Properties

#### `dat.archives`

Array of dat archives that are currently loaded

### Events

#### `archive`

Fired every time a new archive is loaded.

#### `close`

Fired when dat is finished closing, including swarm and database.
