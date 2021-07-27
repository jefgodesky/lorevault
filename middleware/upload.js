const multer = require('multer')
const multerS3 = require('multer-s3')
const { getS3 } = require('../utils')
const { bucket } = require('../config').aws

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

module.exports = upload
