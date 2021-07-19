const { Remarkable } = require('remarkable')

const parse = markdown => {
  const md = new Remarkable()
  return md.render(markdown)
}

module.exports = parse