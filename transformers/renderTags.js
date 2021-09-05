/**
 * By default, this method will strip out any instances of the tag specified
 * along with the contents of those tags. If you set `unwrap` to `true`, it
 * will remove the tags, unwrapping their contents.
 * @param {string} str - The string to transform.
 * @param {string} tag - The tag to render.
 * @param {boolean} [unwrap = false] - (Optional) If set to `true`, any tag
 *   instances are removed, but their contents are left to replace them,
 *   unwrapping them. Otherwise, the tag and its contents are removed.
 * @returns {string} - The string after its tag instances have been rendered
 *   per the options provided.
 */

const renderTags = (str, tag, unwrap = false) => {
  const open = tag
  const close = `</${open.substring(1)}`
  const matches = str.match(new RegExp(`${open}(\\r|\\n|.)*?${close}`, 'gm'))
  if (!matches) return str
  for (const match of matches) {
    const replacement = unwrap ? match.substring(open.length, match.length - close.length) : ''
    str = str.replace(match, replacement)
  }
  return str
}

export default renderTags
