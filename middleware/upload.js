import multer from 'multer'
import multerS3 from 'multer-s3'
import { getS3 } from '../utils.js'
import config from '../config/index.js'
const { bucket } = config.aws

/**
 * Express.js middleware that handles uploading files.
 * @param {object} req - The Express.js request object.
 * @param {object} res - The Express.js response object.
 * @param {function} next - The next function to call.
 */

const upload = multer({
  storage: multerS3({
    s3: getS3(),
    acl: 'public-read',
    bucket,
    contentType: (req, file, callback) => {
      callback(null, file.mimetype)
    },
    key: (req, file, callback) => {
      callback(null, `uploads/${file.originalname}`)
    }
  })
})

export default upload
