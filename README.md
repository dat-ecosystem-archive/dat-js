# dat-api

A pure JavaScript browser-friendly api for using dat.

[![Travis](https://api.travis-ci.org/karissa/dat-api.svg)](https://travis-ci.org/karissa/dat-api)  [![NPM version](https://img.shields.io/npm/v/dat-api.svg?style=flat-square)](https://npmjs.org/package/dat)

## API

#### var dat = new Dat(opts)

#### `dat.add(key, [options], [onrepo])`

Adds a new dat with the given key. Joins the appropriate swarm for that key and begins to upload and download data. The `onrepo` function will be called when the dat is finished being created.

 * `key`: the path on the filesystem to store data
 * `options`: any options you can pass to [mafintosh/hyperdrive](github.com/mafintosh/hyperdrive) or [karissa/hyperdiscovery](github.com/karissa/hyperdiscovery)

### Properties

#### `dat.repos`

Array of repo instances

### Repo

The repo object managed by dat.

#### `repo.key`

The key of the repo

#### `repo.resume()`

Joins the swarm for the repository, beginning to find peers in the network to share with.

#### `repo.pause()`

Pause syncing. This disconnects from any peers currently syncing data with the repo.

#### `repo.destroy()`

Destroys the swarm and underlying database.

#### `repo.swarm`

Get to the original `discovery-swarm` instance, where the swarm can be managed.

#### `repo.archive`

Get to the original `hyperdrive archive` instance, where files can be managed using that api.

### Events

#### `repo`

Fired every time a new repo is ready.

#### `close`

Fired when dat is finished closing, including swarm and database.
