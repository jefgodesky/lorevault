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
    isLoggedIn: Boolean(req.user)
  }
  next()
}

module.exports = initViewOpts
