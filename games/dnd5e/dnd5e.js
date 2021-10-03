import mongoose from 'mongoose'
const { Schema } = mongoose
import { pickRandomNum } from '../../utils.js'

/**
 * Roll a d20, add a modifier, and report the result.
 * @param {{}} params - Parameters for the roll.
 * @param {number} [modifier = 0] - (Optional) The modifier to add to the roll.
 *   (Default: `0`)
 * @param {number} [floor = 1] - (Optional) If you have a special ability that
 *   provides a minimum value that you can roll, provide that value here.
 *   (Default: `1`)
 * @param {boolean} [adv = false] - (Optional) If you have advantage on this
 *   roll, provide `true` to this parameter. (Default: `false`)
 * @param {boolean} [dis = false] - If you have disadvantage on this roll,
 *   provide `true` to this parameter. (Default: `false`)
 * @returns {number} - The result of your roll.
 */

const roll = (params = {}) => {
  const { modifier = 0, floor = 1, adv = false, dis = false } = params
  const n1 = pickRandomNum(1, 20)
  const n2 = pickRandomNum(1, 20)
  const natural = adv ? Math.max(n1, n2) : dis ? Math.min(n1, n1) : n1
  return !isNaN(floor) ? Math.max(natural, floor) + modifier : natural + modifier
}

/**
 * Adds elements needed for D&D 5E to the Character schema.
 * @param {{}} schema - The original Character schema.
 * @returns {{}} - The schema with elements needed for D&D 5E added to it.
 */

const transformCharacterSchema = schema => {
  schema.dnd5e = {
    int: { type: Number, default: 0 },
    arcana: { type: Number, default: 0 },
    history: { type: Number, default: 0 },
    nature: { type: Number, default: 0 },
    religion: { type: Number, default: 0 }
  }
  return schema
}

/**
 * Adds elements needed for D&D 5E to the Page schema.
 * @param {{}} schema - The original Page schema.
 * @returns {{}} - The schema with elements needed for D&D 5E added to it.
 */

const transformPageSchema = schema => {
  schema.dnd5e = [{
    character: { type: Schema.Types.ObjectId, ref: 'Character' },
    int: Number,
    arcana: Number,
    history: Number,
    nature: Number,
    religion: Number
  }]
  return schema
}

/**
 * How does D&D 5E handle each page load? First, we check to see if this
 * character has already checked this page. If hen has, we won't roll again.
 * If hen hasn't, we'll make our rolls for this page now.
 * @param {Page} page - The page being viewed.
 * @param {Character} char - The character viewing the page.
 */

const onPageView = (page, char) => {
  const checked = page.dnd5e.filter(row => row.character === char._id)
  if (checked.length > 0) return
  page.dnd5e.addToSet({
    character: char._id,
    int: roll({ modifier: char.dnd5e.int }),
    arcana: roll({ modifier: char.dnd5e.arcana }),
    history: roll({ modifier: char.dnd5e.hisotry }),
    nature: roll({ modifier: char.dnd5e.nature }),
    religion: roll({ modifier: char.dnd5e.religion })
  })
}

/**
 * Evaluate a condition according to the rules of D&D 5E.
 * @param {string} condition - A string expression of a condition.
 * @param {{}} context - The context in which the condition should
 *   be evaluated.
 * @returns {boolean} - `true` if the condition is true according to the rules
 *   of D&D 5E in the given context, or `false` if it is not (or if the
 *   condition has nothing to do with the rules of D&D 5E).
 */

const evaluate = (condition, context) => {
  if (!context.character?.dnd5e) return false
  const { page, character } = context
  const checks = [
    { match: condition.match(/^Intelligence DC (\d*?)$/im), mod: 'int' },
    { match: condition.match(/^Intelligence \(Arcana\) DC (\d*?)$/im), mod: 'arcana' },
    { match: condition.match(/^Intelligence \(History\) DC (\d*?)$/im), mod: 'history' },
    { match: condition.match(/^Intelligence \(Nature\) DC (\d*?)$/im), mod: 'nature' },
    { match: condition.match(/^Intelligence \(Religion\) DC (\d*?)$/im), mod: 'religion' }
  ]

  let queries = []
  const rows = page.dnd5e.filter(row => row.character === character._id)
  const row = rows && rows.length > 0 ? rows[0] : null
  if (!row) return false
  for (const check of checks) {
    if (check.match?.length > 1) {
      const dc = parseInt(check.match[1])
      if (isNaN(dc)) continue
      queries.push(dc <= row[check.mod])
    }
  }
  return queries.reduce((acc, curr) => acc || curr, false)
}

const info = {
  id: 'dnd5e',
  name: 'Dungeons & Dragons',
  edition: '5th edition'
}

export {
  info,
  transformCharacterSchema,
  transformPageSchema,
  onPageView,
  evaluate
}
