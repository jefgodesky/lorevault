const mongoose = require('mongoose')
const { MongoMemoryServer } = require('mongodb-memory-server')

class TestDB {
  async connect () {
    this.server = await MongoMemoryServer.create()
    const uri = this.server.getUri()
    await mongoose.connect(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      poolSize: 10
    })
  }

  async close () {
    await mongoose.connection.dropDatabase()
    await mongoose.connection.close()
    await this.server.stop()
  }

  async clear () {
    const collections = mongoose.connection.collections
    for (const collection of Object.values(collections)) {
      await collection.deleteMany()
    }
  }
}

module.exports = { TestDB }
