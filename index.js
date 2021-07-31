const createError = require('http-errors')
const express = require('express')
const path = require('path')
const bodyParser = require('body-parser')
const cookieParser = require('cookie-parser')
const logger = require('morgan')
const mongoose = require('mongoose')
const passport = require('passport')
const session = require('express-session')
const MongoStore = require('connect-mongo')
require('./auth')(passport)

const initViewOpts = require('./middleware/initViewOpts')
const ejsHelpers = require('./views/helpers')

const { db, port, secret } = require('./config')
const authRouter = require('./routes/auth')
const userRouter = require('./routes/users')
const charRouter = require('./routes/characters')
const pageRouter = require('./routes/pages')

const server = express()

// Set up database
mongoose.connect(db, { useNewUrlParser: true, useUnifiedTopology: true })

// View engine setup
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
server.use('/character', charRouter)
server.use('/', pageRouter)

// Catch 404 and forward to error handler
server.use((req, res, next) => {
  next(createError(404))
})

// Error handler
server.use((err, req, res, next) => {
  // Set locals, only providing error in development
  res.locals.message = err.message
  res.locals.isLoggedIn = req.viewOpts.isLoggedIn
  res.locals.char = req.viewOpts.char
  res.locals.error = req.app.get('env') === 'development' ? err : {}
  res.locals.resolution = err.status === 404
    ? 'Sorry, that pages does not exist. You can try using the search form above to find what you&rsquo;re looking for.'
    : 'Sorry, something went wrong. Please try again later.'

  // Render the error page
  res.status(err.status || 500)
  res.render('error')
})

server.listen(port, () => {
  console.log(`The LoreVault server is listening on port ${port}`)
})
