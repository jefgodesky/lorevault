const mongoose = require('mongoose')
const { MongoMemoryServer } = require('mongodb-memory-server')

class TestDB {
  constructor () {
    this.server = new MongoMemoryServer()
  }

  async connect () {
    const uri = this.server.getUri()
    await mongoose.connect(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      poolSize: 10
    })
  }

  async disconnect () {
    await mongoose.connection.dropDatabase()
    await mongoose.connection.close()
    await this.server.stop()
  }

  async clear () {
    const collections = mongoose.connection.collections
    for (const key of collections) {
      const collection = collections[key]
      await collection.deleteMany()
    }
  }
}

module.exports = TestDB
