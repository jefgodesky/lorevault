import config from '../config/index.js'
const { name, skin, footer } = config

/**
 * Express.js middleware that initializes a `viewOpts` object that can
 * accumulate data to pass to the template.
 * @param {object} req - The Express.js request object.
 * @param {object} res - The Express.js response object.
 * @param {function} next - The next function to call.
 */

const initViewOpts = (req, res, next) => {
  const pov = req.user?.getPOV()
  req.viewOpts = {
    wiki: name,
    title: req.query?.title || name,
    skin,
    footer,
    isLoggedIn: Boolean(req.user),
    pov: !pov ? 'Anonymous' : pov === 'Loremaster' ? 'Loremaster' : pov.name,
    povLink: pov?.page?.path ? `/${pov.page.path}` : pov === 'loremaster' ? '/profile' : '/',
    get: req.query
  }
  next()
}

export default initViewOpts
