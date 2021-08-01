const { Schema, model } = require('mongoose')
const { rules } = require('../config')

const CharacterSchemaDefinition = {
  page: {
    type: Schema.Types.ObjectId,
    ref: 'Page'
  },
  player: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  }
}

for (const system of rules) {
  const stats = require(`../rules/${system}/sheet`)
  CharacterSchemaDefinition[system] = {}
  for (const stat of Object.keys(stats)) {
    CharacterSchemaDefinition[system][stat] = stats[stat].type
  }
}

const CharacterSchema = new Schema(CharacterSchemaDefinition)

/**
 * Return all of a user's characters.
 * @param {User|Schema.Types.ObjectID|number} user - The user (or the ID of the
 *   user) whose characters you wish to return.
 * @returns {Promise<Character[]>} - A Promise tht resolves with the user's
 *   characters.
 */

CharacterSchema.statics.getCharacters = async function (user) {
  const id = user._id ? user._id : user
  return this.find({ player: id }).populate('page')
}

/**
 * Returns `true` if the page is one of the user's characters, or false if it
 * is not.
 * @param {Page|Schema.Types.ObjectID|number} page - The page to check (or the
 *   ID of the page to check).
 * @param {User|Schema.Types.ObjectID|number} user - The user to check (or the
 *   ID of the user to check).
 * @returns {Promise<boolean>} - A Promise that resolves with `true` if the
 *   page is that of one of the user's characters, or `false` if it is not.
 */

CharacterSchema.statics.isYourCharacter = async function (page, user) {
  const pid = page._id ? page._id : page
  const uid = user._id ? user._id : user
  const check = await this.findOne({ page: pid, player: uid })
  return Boolean(check)
}

/**
 * Read the sort of form produced using the getSystemsDisplay utility and use
 * it to produce the values used in a Character instance.
 * @param {obj} form - An object with the results of a form created with the
 *   getSystemsDisplay utility method.
 * @returns {obj} - An object ready to be used in a Character instance.
 */

CharacterSchema.statics.readForm = function (form) {
  const obj = {}
  for (const system of rules) {
    obj[system] = {}
    const stats = require(`../rules/${system}/sheet`)
    for (const stat of Object.keys(stats)) {
      obj[system][stat] = stats[stat].type === Number
        ? parseInt(form[`${system}-${stat}`])
        : form[`${system}-${stat}`]
    }
  }
  return obj
}

module.exports = model('Character', CharacterSchema)
