var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');

const mongoose = require('mongoose')

const CONFIG = require('./config')

//Mongoose
mongoose.connect(CONFIG.db.mongoUri, {
  useNewUrlParser: true,
  poolSize: 3,
  useUnifiedTopology: true,
  reconnectTries: 1000,
})

console.log('Connected to database')

require('./bootstrap')

var app = express();

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
var ocrRouter = require('./routes/ocr');


// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use(function (req, res, next) {
  let ip = {
    header: req.headers['x-forwarded-for'],
    remoteAddr: req.connection.remoteAddress,
    socketAddr: req.socket.remoteAddress,
    connSocket: (req.connection.socket ? req.connection.socket.remoteAddress : null)
  }
  console.log(ip);
  console.log('IP', getIP(ip.header) || getIP(ip.remoteAddr) || getIP(ip.socketAddr) || getIP(ip.connSocket), 'accessing', req.method, req.url)
  req.reqIp = getIP(ip.header) || getIP(ip.remoteAddr) || getIP(ip.socketAddr) || getIP(ip.connSocket)
  next()
})

app.use('/', indexRouter);
app.use('/users', usersRouter);
app.use('/ocr-' + CONFIG.app.secretPath, ocrRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  return res.status(404).json({
    status: 'error',
    error: '404 Not Found'
  })
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

function getIP(str) {
  if (!str) {
    return ''
  }
  let regex = /\d+\.\d+\.\d+\.\d+/
  if (!regex.test(str)) {
    return ''
  }
  return str.match(regex)[0]
}

module.exports = app;
