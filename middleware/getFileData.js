import config from '../config/index.js'
const { domain } = config.aws

/**
 * Express.js middleware that parses file data into a format ready to be used
 * by the Page model.
 * @param {object} req - The Express.js request object.
 * @param {object} res - The Express.js response object.
 * @param {function} next - The next function to call.
 */

const getFileData = (req, res, next) => {
  if (!req.file) return next()
  const { file } = req
  const data = {}
  if (file.key) data.url = `${domain}/${file.key}`
  if (file.contentType) data.mimetype = file.contentType
  if (file.size) data.size = file.size
  req.fileData = data
  return next()
}

export default getFileData
