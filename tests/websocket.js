var test = require('tape')
var Dat = require('..')

test('replicate a dat over websockets', function (t) {
  var dat = new Dat({
    websocketServer: 'ws://gateway.mauve.moe:3000'
  })
  t.equals(dat.repos.length, 0, 'has zero repos before adding')

  console.log('Loading dat')

  // Load the dat project website
  var key = '60c525b5589a5099aa3610a8ee550dcd454c3e118f7ac93b7d41b6b850272330'
  var repo = dat.add(key);

  repo.once('ready', () => {
    console.log('Archive ready')

    // Load the about page
    repo.archive.readFile('/about/index.html', 'utf-8', function (err, data) {
      console.log('Got data', data)

      // Set it as the page contents
      document.body.innerHTML = data
    })
  })
})
