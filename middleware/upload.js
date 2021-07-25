const aws = require('aws-sdk')
const multer = require('multer')
const multerS3 = require('multer-s3')
const config = require('../config')

aws.config.update({
  endpoint: `https://s3.${config.aws.region}.stackpathstorage.com`,
  accessKeyId: config.aws.key,
  secretAccessKey: config.aws.secret
})

const s3 = new aws.S3()

const upload = multer({
  storage: multerS3({
    s3,
    acl: 'public-read',
    bucket: config.aws.bucket,
    contentType: multerS3.AUTO_CONTENT_TYPE,
    key: (req, file, callback) => {
      callback(null, `uploads/${file.originalname}`)
    }
  })
})

module.exports = upload
