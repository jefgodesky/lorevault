/**
 * Express.js middleware that initializes a `viewOpts` object that can
 * accumulate data to pass to the template.
 * @param {object} req - The Express.js request object.
 * @param {object} res - The Express.js response object.
 * @param {function} next - The next function to call.
 */

const initViewOpts = (req, res, next) => {
  req.viewOpts = {
    title: 'LoreVault',
    char: req.user?.activeChar
      ? { id: req.user.activeChar._id, name: req.user.activeChar.page?.title, path: `/${req.user.activeChar.page?.path}` }
      : undefined,
    isLoggedIn: Boolean(req.user),
    charClaimMode: req.user?.charClaimMode
  }
  console.log(req.viewOpts)
  next()
}

module.exports = initViewOpts
