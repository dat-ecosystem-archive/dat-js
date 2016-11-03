# dat-api

## API

#### var dat = new Dat(opts)

#### dat.add(path, opts, onrepo)

Adds a new dat at the given path on the filesystem. Creates a `.dat` folder that manages the state of the dat.

 * `path`: the path on the filesystem to store data
 * The `onrepo` function will be called when the dat is finished being created.

#### dat.watch(repo)

Watches the repository and adds/updates/deletes new files in the default/recommended way.

#### dat.join(repo)

Joins the swarm in the default/recommended way.

#### dat.leave(repo)

Leaves the swarm.

#### dat.remove(repo)

Removes the repo from the dat object. Does this delete the files, too? OR just deletes the .dat folder?

### Properties

#### dat.swarm

The swarm instance(s).

#### dat.repos

Array of repo instances

### Repo

The repo object managed by dat.

#### repo.key

The key of the repo

#### repo.privateKey

The private key of the repo. Used for granting write access.

#### repo.pause()

Pause syncing.

#### repo.resume()

Resume syncing.

#### repo.archive

Get to the original `hyperdrive archive` instance, where files can be managed using that api.

### Events

#### dat.on('repo')

Fired every time a new repo is ready.
