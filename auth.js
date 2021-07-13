const GoogleStrategy = require('passport-google-oauth20').Strategy
const User = require('./models/user')
const { google } = require('./config')

const initPassport = passport => {
  passport.use(new GoogleStrategy({
    clientID: google.id,
    clientSecret: google.secret,
    callbackURL: google.callback,
    passReqToCallback: true
  }, async (req, token, refresh, profile, done) => {
    try {
      if (req.user) {
        req.user.googleID = profile.id
        await req.user.save()
        return done(null, req.user)
      }
      let user = await User.findOne({googleID: profile.id})
      if (user) return done(null, user)
      user = await User.create({
        googleID: profile.id
      })
      return done(null, user)
    } catch (err) {
      console.error(err)
    }
  }))

  passport.serializeUser((user, done) => done(null, user.id))
  passport.deserializeUser((id, done) => {
    User.findById(id, (err, user) => done(err, user))
  })
}

module.exports = initPassport
