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

module.exports = {
  getS3,
  getSVG
}
