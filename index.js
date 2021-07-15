const createError = require('http-errors')
const express = require('express')
const path = require('path')
const cookieParser = require('cookie-parser')
const logger = require('morgan')
const mongoose = require('mongoose')
const passport = require('passport')
const session = require('express-session')
const MongoStore = require('connect-mongo')
require('./auth')(passport)

const initViewOpts = require('./middleware/initViewOpts')

const { db, port, secret } = require('./config')
const indexRouter = require('./routes/index')
const authRouter = require('./routes/auth')
const charRouter = require('./routes/characters')
const pageRouter = require('./routes/pages')

const server = express()

// Set up database
mongoose.connect(db, { useNewUrlParser: true, useUnifiedTopology: true })

// View engine setup
server.set('views', path.join(__dirname, 'views'))
server.set('view engine', 'ejs')

server.use(logger('dev'))
server.use(express.json())
server.use(express.urlencoded({ extended: true }))
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
server.use('/', indexRouter)
server.use('/', authRouter)
server.use('/characters', charRouter)
server.use('/', pageRouter)

// Catch 404 and forward to error handler
server.use((req, res, next) => {
  next(createError(404))
})

// Error handler
server.use((err, req, res, next) => {
  // Set locals, only providing error in development
  res.locals.message = err.message
  res.locals.error = req.app.get('env') === 'development' ? err : {}

  // Render the error page
  res.status(err.status || 500)
  res.render('error')
})

server.listen(port, () => {
  console.log(`The LoreVault server is listening on port ${port}`)
})
