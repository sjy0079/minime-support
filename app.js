let createError = require('http-errors');
let express = require('express');
let path = require('path');
let cookieParser = require('cookie-parser');
let logger = require('morgan');

let checkUpdate = require('./routes/check-update');
// chuni
let modify = require('./routes/chunithm/modify');
let giftCharas = require('./routes/chunithm/gift-charas');
let query = require('./routes/query');
let items = require('./routes/chunithm/items');
let userInfo = require('./routes/chunithm/user-info');
// ongeki
let ongekiAddCard = require('./routes/ongeki/add-card');

let compression = require('compression');
let app = express();

app.all('/*', (req, res, next) => {
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Origin', req.headers.origin);
  res.header('Access-Control-Allow-Methods',
      'GET,PUT,POST,DELETE,OPTIONS,HEAD,PATCH');
  res.header('Access-Control-Allow-Headers',
      'Origin, X-Requested-With, Content-Type, Accept, apikey');
  next();
});

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

app.use(compression());
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({extended: false}));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/modifyUserInfo', modify);
app.use('/giftCharas', giftCharas);
app.use('/query', query);
app.use('/items', items);
app.use('/userInfo', userInfo);
app.use('/checkUpdate', checkUpdate);
app.use('/ongekiAddCard', ongekiAddCard);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
