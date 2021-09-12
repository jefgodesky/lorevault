import createError from 'http-errors'
import express from 'express'
import path from 'path'
import bodyParser from 'body-parser'
import cookieParser from 'cookie-parser'
import logger from 'morgan'
import mongoose from 'mongoose'
import passport from 'passport'
import session from 'express-session'
import MongoStore from 'connect-mongo'

import './models/user.js'
import './models/page.js'
import './models/character.js'

import initPassport from './auth.js'
initPassport(passport)

import initViewOpts from './middleware/initViewOpts.js'
import ejsHelpers from './views/helpers.js'

import config from './config/index.js'
const { db, port, name, secret } = config
import authRouter from './routes/auth.js'
import userRouter from './routes/users.js'
import pageRouter from './routes/pages.js'

const server = express()

// Set up database
mongoose.connect(db, { useNewUrlParser: true })

// View engine setup
const moduleURL = new URL(import.meta.url)
const __dirname = path.dirname(moduleURL.pathname)
server.set('views', path.join(__dirname, 'views'))
server.set('view engine', 'ejs')
Object.keys(ejsHelpers).forEach(key => {
  server.locals[key] = ejsHelpers[key]
})

server.use(logger('dev'))
server.use(express.json())
server.use(express.urlencoded({ extended: true }))
server.use(bodyParser.json())
server.use(cookieParser())
server.use(express.static(path.join(__dirname, 'public')))
server.use(session({
  secret,
  resave: false,
  saveUninitialized: false,
  store: new MongoStore({ mongoUrl: db })
}))
server.use(passport.initialize())
server.use(passport.session())

// Set up middleware
server.use(initViewOpts)

// Set up routers
server.use('/', authRouter)
server.use('/', userRouter)
server.use('/', pageRouter)

// Catch 404 and forward to error handler
server.use((req, res, next) => {
  next(createError(404))
})

// Error handler
server.use((err, req, res, next) => {
  // Set locals, only providing error in development
  res.locals.message = err.message
  res.locals.error = req.app.get('env') === 'development' ? err : { status: err.status }
  res.locals.resolution = err.status === 404
    ? 'Sorry, that pages does not exist. You can try using the search form above to find what you&rsquo;re looking for.'
    : 'Sorry, something went wrong. Please try again later.'

  // Render the error page
  res.status(err.status || 500)
  res.render('error', req.viewOpts)
})

server.listen(port, () => {
  console.log(`${name} server is listening on port ${port}`)
})
