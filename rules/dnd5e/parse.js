const checks = require('./checks')

const parse = str => {
  for (const check of checks) {
    let match = str.match(check.regex)
    while (match) {
      str = str.replace(match[0], '').trim()
      match = str.match(check.regex)
    }
  }
  return str
}

module.exports = parse
