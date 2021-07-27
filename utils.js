const aws = require('aws-sdk')
const config = require('./config')

const getS3 = () => {
  const { endpoint, key, secret } = config.aws
  aws.config.update({ endpoint: endpoint, accessKeyId: key, secretAccessKey: secret })
  return new aws.S3()
}

module.exports = {
  getS3
}
