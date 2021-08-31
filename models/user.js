import { Schema, model } from 'mongoose'

const UserSchema = new Schema({
  name: String,
  login: {
    google: String,
    discord: String
  }
})

export default model('User', UserSchema)
