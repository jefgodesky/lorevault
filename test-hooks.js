import mongoose from 'mongoose'
import { MongoMemoryServer } from 'mongodb-memory-server'

class TestDB {
  async connect () {
    this.server = await MongoMemoryServer.create()
    const uri = this.server.getUri()
    await mongoose.connect(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true
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

const db = new TestDB()
const beforeAll = async () => { await db.connect() }
const afterEach = async () => { await db.clear() }
const afterAll = async () => { await db.close() }
export const mochaHooks = { beforeAll, afterEach, afterAll }
