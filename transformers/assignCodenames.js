/**
 * Transforms a string to give each secret a codename if it doesn't already
 * have one, and then returns the transformed string and an object documenting
 * all of the secrets and the codenames assigned to each one.
 * @param {string} str - The string to transform.
 * @param {function} codenamer - A function which takes an object as its
 *   parameter and returns a new random string that is not currently the name
 *   of any proeprty in the object.
 * @returns {{str, secrets: {}}} - The transformed string and an object
 *   documenting all of the secrets in it and the codenames assigned to each.
 */

const assignCodenames = (str, codenamer) => {
  const secrets = {}
  const matches = str.match(/\|\|((.|\n|\r)*?)\|\|/gm)
  if (!matches) return { str, secrets }
  for (const match of matches) {
    const inside = match.substring(2, match.length - 2).trim()
    const codenameMatch = inside.match(/::(.*?)::/)
    const codename = codenameMatch && codenameMatch.length > 1 ? codenameMatch[1] : codenamer(secrets)
    const content = inside.replace(/::.*?::/, '').trim()
    const newInside = String(`::${codename}:: ${content}`).trim()
    secrets[codename] = { content }
    str = str.replace(match, `||${newInside}||`)
  }
  return { str, secrets }
}

export default assignCodenames
