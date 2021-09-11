import PassportGoogle from 'passport-google-oauth20'
import PassportDiscord from 'passport-discord'
import User from './models/user.js'
import config from './config/index.js'

const GoogleStrategy = PassportGoogle.Strategy
const DiscordStrategy = PassportDiscord.Strategy
const { google, discord } = config

const initPassport = passport => {
  passport.use(new GoogleStrategy({
    clientID: google.id,
    clientSecret: google.secret,
    callbackURL: google.callback,
    passReqToCallback: true
  }, async (req, token, refresh, profile, done) => {
    try {
      if (req.user) {
        req.user.login.google = profile.id
        await req.user.save()
        return done(null, req.user)
      }
      let user = await User.findOne({ 'login.google': profile.id })
      if (user) return done(null, user)
      user = await User.create({ login: { google: profile.id } })
      if (profile.displayName) {
        user.name = profile.displayName
        await user.save()
      }
      return done(null, user)
    } catch (err) {
      console.error(err)
    }
  }))

  passport.use(new DiscordStrategy({
    clientID: discord.id,
    clientSecret: discord.secret,
    callbackURL: discord.callback,
    passReqToCallback: true
  }, async (req, token, refresh, profile, done) => {
    try {
      if (req.user) {
        req.user.login.discord = profile.id
        await req.user.save()
        return done(null, req.user)
      }
      let user = await User.findOne({ 'login.discord': profile.id })
      if (user) return done(null, user)
      user = await User.create({ login: { discord: profile.id } })
      if (profile.username) {
        user.name = profile.username
        await user.save()
      }
      return done(null, user)
    } catch (err) {
      console.error(err)
    }
  }))

  passport.serializeUser((user, done) => done(null, user.id))
  passport.deserializeUser((id, done) => {
    User.findById(id, (err, user) => done(err, user))
      .populate({ path: 'characters.active', populate: { path: 'page' } })
      .populate({ path: 'characters.list', populate: { path: 'page' } })
  })
}

export default initPassport
