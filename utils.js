const aws = require('aws-sdk')
const axios = require('axios')
const config = require('./config')

/**
 * Instantiate an S3 object, ready to handle interactions with the appropriate
 * S3 bucket.
 * @returns {S3} - An instantiated S3 object.
 */

const getS3 = () => {
  const { endpoint, key, secret } = config.aws
  aws.config.update({ endpoint: endpoint, accessKeyId: key, secretAccessKey: secret })
  return new aws.S3()
}

/**
 * Fetch the contents of an SVG file. This strips out any initial XML
 * declaration that may appear on the top line, so that the string returned is
 * ready to be embedded in HTML as SVG.
 * @param {string} url - The remote SVG file to load.
 * @returns {Promise<string>} - A Promise that resolves with the contents of
 *   the SVG file loaded, if an SVG file could be loaded, or an empty null
 *   string if anything went awry.
 */

const getSVG = async url => {
  try {
    const res = await axios.get(url)
    if (res.status !== 200 || res.headers['content-type'] !== 'image/svg+xml') return ''
    return res.data.substr(0, 6) === '<?xml '
      ? res.data.substr(res.data.indexOf('<', 1))
      : res.data
  } catch {
    return ''
  }
}

/**
 * Return an object that provides information needed to render the statistics
 * that can be offered for a character under a particular set of rules systems.
 * @param {string[]} systems - An array of strings specifying the rules systems
 *   that you would like to use.
 * @param {Character} char - (Optional) A Character instance. If supplied, each
 *   field will have a value equal to the character's value for each statistic.
 *   If not supplied, or for any statistic that the character does not have,
 *   the object sets `value` to `undefined`.
 * @returns {obj} - An object describing the rules and the statistics for each
 *   ruleset, and how to render its form.
 */

const getSystemsDisplay = (systems, char) => {
  const arr = []
  for (const system of systems) {
    const meta = require(`./rules/${system}/meta.json`)
    const sheet = require(`./rules/${system}/sheet`)
    const stats = Object.keys(sheet).map(key => ({
      id: `${system}-${key}`,
      label: sheet[key].label,
      type: sheet[key].type === Number ? 'number' : 'text',
      value: char && char[system] && char[system][key] ? char[system][key] : undefined
    }))
    arr.push(Object.assign({}, meta, { stats }))
  }
  return arr
}

module.exports = {
  getS3,
  getSVG,
  getSystemsDisplay
}
