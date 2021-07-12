const createError = require('http-errors')
const express = require('express')
const path = require('path')
const cookieParser = require('cookie-parser')
const logger = require('morgan')

const { port } = require('./config')
const indexRouter = require('./routes/index')

const server = express()

// View engine setup
server.set('views', path.join(__dirname, 'views'))
server.set('view engine', 'ejs')

server.use(logger('dev'))
server.use(express.json())
server.use(express.urlencoded({ extended: false }))
server.use(cookieParser())
server.use(express.static(path.join(__dirname, 'public')))

server.use('/', indexRouter)

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
