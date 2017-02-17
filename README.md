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
var concat = require('concat-stream')

var dat = Dat()
dat.add('ARCHIVE_KEY', function (repo) {
  var readStream = repo.archive.createFileReadStream('hello.txt')
  concat(readStream, function (data) {
    console.log(data)
  })
})
```

#### Replicating a dat in memory

```js
var Dat = require('dat-js')

var dat = Dat()
dat.add(function (repo) {
  console.log('dat key is:', repo.key)
  var writer = repo.archive.createFileWriteStream('hello.txt')
  writer.write('world')
  writer.end(function () { replicate(repo.key) })
})

function replicate (key) {
  var clone = Dat()
  clone.add(key, function (repo) {
    var readStream = repo.archive.createFileReadStream('hello.txt')
    readStream.on('data', function (data) {
      console.log(data.toString()) // prints 'world'
    })
  })
}
```

## API

#### `var dat = new Dat([options])`

Creates a new dat object. The options passed here will be default for any dats created using the `add` method.

 * `options`: any options you can pass to [mafintosh/hyperdrive](https://github.com/mafintosh/hyperdrive). These options will become default for all dats.

#### `dat.add(key, [options], [onrepo])`

Adds a new dat with the given key. Joins the appropriate swarm for that key and begins to upload and download data. The `onrepo` function will be called when the dat is finished being created.

 * `options`: These options will override any options given in the Dat constructor.

### Properties

#### `dat.repos`

Array of repo instances

### Repo

The repo object managed by dat.

#### `repo.key`

The key of the repo

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
