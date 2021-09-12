import aws from 'aws-sdk'
import config from './config/index.js'

/**
 * Return a random number from an inclusive range.
 * @param {...number} numbers - Two or more numbers. A minimum and maximum are
 *   found from this set, and a random number is returned between those.
 * @returns {number} - A random number chosen from between the smallest number
 *   provided as a parameter and the largest.
 */

const pickRandomNum = (...numbers) => {
  const min = Math.min(...numbers)
  const max = Math.max(...numbers)
  return Math.floor(Math.random() * max) + min
}

/**
 * Return a random element from an array.
 * @param {*[]} arr - An array of elements.
 * @returns {*} - A random element from the array given.
 */

const pickRandom = arr => arr[pickRandomNum(0, arr.length - 1)]

/**
 * Round a number to a given number of decimal places.
 * @param {number} num - The number to be rounded.
 * @param {number} places - The number of decimal places to round `num` to.
 * @returns {number} - `num` rounded to `places` decimal places.
 */

const round = (num, places) => {
  const factor = 10 ** places
  return Math.round(num * factor) / factor
}

/**
 * Returns the union of several arrays.
 * @param {...*[]} arr - One of the arrays to create a union from.
 * @returns {*[]} - An array that is the union of all arrays passed to the
 *   method as parameters.
 */

const union = (...arr) => {
  let all = []
  for (let i = 0; i < arr.length; i++) all = [...all, ...arr[i]]
  return [...new Set(all)]
}

/**
 * Returns the intersection of several arrays.
 * @param {...*[]} arr - One of the arrays to create an intersection from.
 * @returns {*[]} - An array that is the intersection of all arrays passed to
 *   the method as parameters.
 */

const intersection = (...arr) => {
  let intersection = []
  for (let i = 0; i < arr.length; i++) {
    if (i === 0) {
      intersection = arr[i]
    } else {
      intersection = intersection.filter(el => arr[i].includes(el))
    }
  }
  return intersection
}

/**
 * If one or more elements in the array meet the criteria set by the filtering
 * function `fn`, return the first element in the array that does so.
 * @param {*[]} arr - An array in which we want to find the first element that
 *   meets the criteria set by the filtering function `fn`.
 * @param {function} fn - The filtering function for the element.
 * @returns {*|null} - The first element in the array that meets the criteria
 *   set by the filtering function `fn`, if one exists; otherwise, `null`.
 */

const findOne = (arr, fn) => {
  const filtered = arr.filter(fn)
  return filtered.length > 0 ? filtered[0] : null
}

/**
 * Wrap a Mongoose query on the Page model in typical safeguards to protect
 * secret pages. For an anonymous searcher, show only pages that aren't secret
 * at all. For searchers seeing the wiki from a character's point of view, show
 * only those pages that aren't a secret at all, or that the POV character
 * knows about. For loremasters, show everything.
 * @param {{}} orig - The Mongoose query object.
 * @param {User|string} searcher - The User who's conducting the search, or the
 *   string `Loremaster` for a loremaster, or the string `Anonymous` for an
 *   anonymous user.
 * @returns {{}} - A modified Mongoose query object that takes Page secrecy and
 *   the user's point of view into account.
 */

const makeDiscreetQuery = (orig, searcher) => {
  const pov = searcher?.getPOV ? searcher.getPOV() : searcher === 'Loremaster' ? 'Loremaster' : 'Anonymous'
  return pov === 'Loremaster'
    ? orig
    : pov === 'Anonymous'
      ? { $and: [orig, { 'secrets.existence': false }] }
      : { $and: [orig, { $or: [{ 'secrets.existence': false }, { 'secrets.knowers': pov._id }] }] }
}

/**
 * This method allows us to do a global regular expression search over an
 * entire string, and still get the index for each instance.
 * @param {string} str - The string to search.
 * @param {RegExp} regex - The regular expression to use.
 * @returns {{str: string, index: number}[]} - An array of objects representing
 *   the matches found. Each object has the following properties:
 *     `str`    The string that was matched.
 *     `index`  The index at which this instance was found.
 */

const match = (str, regex) => {
  const matches = []
  let index = 0
  while (index !== null && index < str.length) {
    const match = str.substring(index).match(regex)
    if (!match) { index = null; continue }
    index += match.index
    matches.push({ str: match[0], index })
    index += match[0].length
  }
  return matches
}

/**
 * This method pulls blocks of text out of a string, along with information
 * needed to restore it later, perhaps after some other transformations have
 * been done on the string.
 * @param {string} str - The string being operated on.
 * @param {RegExp} regex - The regular expression of the substrings that we'd
 *   like to find and save.
 * @param {string} [code = 'STR'] - A string used to identify substrings saved
 *   by one execution of this method versus another. For example, with the
 *   default value of `STR`, the first matched string will be replaced with
 *   `####STR0001####`, the second by `####STR0002####`, and so on.
 * @returns {{str: string, blocks: {str: string, index: number}[], code: string}} -
 *   An object with the following properties:
 *     `str`      The string that we're working on.
 *     `blocks`   The blocks that were replaced. This is an array of objects.
 *                Each object includes a property `str` (the original string
 *                that was replaced) and a property `key` (the string with
 *                which `str` was replaced in the new string).
 */

const saveBlocks = (str, regex, code = 'STR') => {
  let cpy = str
  const matches = match(str, regex)
  const blocks = []
  for (let i = 0; i < matches.length; i++) {
    const key = `####${code.toUpperCase()}${String(i + 1).padStart(4, '0')}####`
    blocks.push({ str: matches[i].str, key })
    cpy = cpy.replace(matches[i].str, key)
  }
  return { str: cpy, blocks }
}

/**
 * This method reverses the `saveBlocks` method, replacing each replacement
 * string with the original string that was replaced.
 * @param {string} str - The string we're working on.
 * @param {{str: string, key: string}[]} blocks - An array of objects with data
 *   for the blocks to be restored. This should come from a previous run of the
 *   `saveBlocks` method.
 * @returns {string} - The original string with all blocks restored.
 */

const restoreBlocks = (str, blocks) => {
  let cpy = str
  for (const block of blocks) {
    cpy = cpy.replace(block.key, block.str)
  }
  return cpy
}

/**
 * Translates a number of bytes into a human-readable file size.
 * @param {number} bytes - A number of bytes.
 * @returns {string} - A string communicating the number of bytes given in a
 *   human-readable format.
 */

const getReadableFileSize = bytes => {
  const kB = round(bytes / 1000, 1)
  const MB = round(kB / 1000, 1)
  const GB = round(MB / 1000, 1)
  const val = kB < 1 ? bytes : MB < 1 ? kB : GB < 1 ? MB : GB
  const unit = kB < 1 ? 'B' : MB < 1 ? 'kB' : GB < 1 ? 'MB' : 'GB'
  return `${val} ${unit}`
}

/**
 * Checks to see if the subject (`subj`) appears within any of the secrets in
 * the string provided (`body`).
 * @param {object} subj - An object that provides data on the string we're
 *   looking for. An object like this is provided by the `match` method.
 * @param {number} subj.index - The index in the `body` string at which this
 *   substring begins.
 * @param {string} subj.str - The substring of `body` that this object provides
 *   data on.
 * @param {string} body - The entire body string.
 * @returns {string|boolean} - The codename of the secret that `subj` appears
 *   in, if appears in any secret at all, or `false` if it does not.
 */

const isInSecret = (subj, body) => {
  const start = subj.index
  const end = start + subj.str.length
  const secrets = match(body, /\|\|::.*?::\s*?.*?\|\|/m)
  for (const secret of secrets) {
    if (secret.index <= start && secret.index + secret.str.length >= end) {
      const codenameMatch = secret.str.match(/::(.*?)::/)
      return codenameMatch && codenameMatch.length > 1 ? codenameMatch[1] : secret.str
    }
  }
  return false
}

/**
 * Find the index of the first instance of a substring that matches a given
 * regular expression. Effectively, this is a version of
 * `String.prototype.indexOf()` that can take a regular expression instead of
 * a string.
 * @param {string} str - The string to search.
 * @param {RegExp} regex - The regular expression to search for.
 * @param {number?} start - (Optional). The index to start searching from
 *   (Default: `0`)
 * @returns {number} - The index of the first instance of a substring after the
 *   `start` argument that matches the given regular expression (`regex`). If
 *   no such substring can be found, it returns -1 instead.
 */

const indexOfRegExp = (str, regex, start = 0) => {
  const index = str.substring(start).search(regex)
  return index > -1 ? index + start : index
}

/**
 * Sort the items in an array in alphabetical order.
 * @param {*[]} arr - The array to be sorted into alphabetical order.
 * @param {function} fn - This function takes an element from the array as a
 *   parameter, and returns the string that should be used to alphabetically
 *   sort that element. The default function just applies the `.toString`
 *   method to the element.
 * @returns {*[]} - The original array, sorted into alphabetical order.
 */

const alphabetize = (arr, fn = el => el.toString()) => {
  return arr.sort((a, b) => {
    const astr = fn(a)
    const bstr = fn(b)
    return astr < bstr ? -1 : astr > bstr ? 1 : 0
  })
}

/**
 * Instantiate an S3 object, ready to handle interactions with the appropriate
 * S3 bucket.
 * @returns {S3} - An instantiated S3 object.
 */

const getS3 = () => {
  const { endpoint, key, secret } = config.aws
  aws.config.update({ endpoint, accessKeyId: key, secretAccessKey: secret })
  return new aws.S3()
}

export {
  pickRandomNum,
  pickRandom,
  round,
  union,
  intersection,
  findOne,
  makeDiscreetQuery,
  match,
  saveBlocks,
  restoreBlocks,
  getReadableFileSize,
  isInSecret,
  indexOfRegExp,
  alphabetize,
  getS3
}
