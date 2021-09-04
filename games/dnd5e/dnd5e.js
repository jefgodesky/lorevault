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
 * Make a roll and see if it is greater than or equal to the dificulty class
 * (DC) specified.
 * @param {number} dc - The difficulty class for the check.
 * @param {{}} params - Parameters for the roll.
 * @param {number} modifier - The modifier to add to the roll.
 * @param {number} floor - If you have a special ability that provides a
 *   minimum value that you can roll, provide that value here.
 * @param {boolean} adv - If you have advantage on this roll, provide `true`
 *   to this parameter.
 * @param {boolean} dis - If you have disadvantage on this roll, provide `true`
 *   to this parameter.
 * @returns {number} - The result of your roll.
 */

const check = (dc, params) => {
  return roll(params) >= dc
}

const info = {
  id: 'dnd5e',
  name: 'Dungeons & Dragons',
  edition: '5th edition',
  sheet: [
    {
      id: 'int',
      label: 'Intelligence',
      detail: 'Intelligence Ability Modifier',
      regex: /\[Intelligence DC (\d+)]/im,
      type: Number,
      default: 0
    },
    {
      id: 'arcana',
      label: 'Arcana',
      detail: 'Intelligence (Arcana) Modifier',
      regex: /\[Intelligence \(Arcana\) DC (\d+)]/im,
      type: Number,
      default: 0
    },
    {
      id: 'history',
      label: 'History',
      detail: 'Intelligence (History) Modifier',
      regex: /\[Intelligence \(History\) DC (\d+)]/im,
      type: Number,
      default: 0
    },
    {
      id: 'nature',
      label: 'Nature',
      detail: 'Intelligence (Nature) Modifier',
      regex: /\[Intelligence \(Nature\) DC (\d+)]/im,
      type: Number,
      default: 0
    },
    {
      id: 'religion',
      label: 'Religion',
      detail: 'Intelligence (Religion) Modifier',
      regex: /\[Intelligence \(Religion\) DC (\d+)]/im,
      type: Number,
      default: 0
    }
  ]
}

export {
  info,
  roll,
  check
}
