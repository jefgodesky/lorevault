const checks = require('./checks')

/**
 * Roll a d20, add the modifier, and return the result.
 * @param {number} modifier - (Optional) A number to add to the die roll.
 *   (Default: `0`)
 * @returns {number} - The result of the dice roll plus the modifier.
 */

const roll = (modifier = 0) => Math.floor(Math.random() * 20) + 1 + modifier

/**
 * Check to see if the secret calls for any D&D 5E skill checks. If it does,
 * make the checks called for. If any of the checks pass, return `true`.
 * Otherwise, return `false`.
 * @param {string} secret - The string to check.
 * @param {Character} char - A Character schema object.
 * @returns {boolean} - `true` if the character made at least one of the checks
 *   called for in the secret, or `false` if hen did not.
 */

const checkSecret = (secret, char) => {
  for (const check of checks) {
    const { regex, stat } = check
    const match = secret.match(regex)
    if (!match || match.length < 1) continue
    const dc = parseInt(match[1])
    if (isNaN(dc)) continue
    const res = roll(char.dnd5e[stat])
    if (res >= dc) return true
  }

  return false
}

module.exports = checkSecret
