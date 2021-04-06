//import packages
const path = require('path');
const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoDBStore = require('connect-mongodb-session')(session);
const csrf = require('csurf');
const flash = require('connect-flash');
const multer = require('multer');
//import a error controllee page
const errorController = require('./controllers/error');
//import user model database
const User = require('./models/user');
//import routes folder
const adminRoutes = require('./routes/admin');
const shopRoutes = require('./routes/shop');
const authRoutes = require('./routes/auth');

//set connection URL to database
const MONGODB_URI =
  'mongodb+srv://Araraef22:P3MOglMyOqwXvgX1@cluster0.fwsyw.mongodb.net/shop';


const app = express();

//set viewEngine we use (EJS)
app.set('view engine', 'ejs');
app.set('views', 'views');

//set static folder mean we deal with files in this folder as if they are on the rooot folder as app.js
app.use(express.static(path.join(__dirname, 'public')));
app.use('/images', express.static(path.join(__dirname, 'images')));

//we connect our session with data base 
const store = new MongoDBStore({
  uri: MONGODB_URI,
  collection: 'sessions'
});

const csrfProtection = csrf();

//set the destination folder we upload image to 
const fileStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'images');
  },//set the new image name in the folder
  filename: (req, file, cb) => {
    cb(null, new Date().toISOString().replace(/:/g, '-') + '-' + file.originalname);
  }
});

//filter type of files we can upload 
const fileFilter = (req, file, cb) => {
  if (
    file.mimetype === 'image/png' ||
    file.mimetype === 'image/jpg' ||
    file.mimetype === 'image/jpeg'
  ) {
    cb(null, true);
  } else {
    cb(null, false);
  }
};

//set bodyparser(urlencoded) to parse string data from views
app.use(bodyParser.urlencoded({ extended: false }));
//set multer to parse images from views as it is a binary data 
//we tell multer to upload the image in image input field in a view to
//the path we initialize and by the name we initialize
app.use(
  multer({ storage: fileStorage, fileFilter: fileFilter }).single('image')
);

//initi session
app.use(
  session({
    secret: 'my secret',
    resave: false,
    saveUninitialized: false,
    store: store
  })
);

app.use(csrfProtection);
app.use(flash());

//set local variables to be used for all views 
app.use((req, res, next) => {
  res.locals.isAuthenticated = req.session.isLoggedIn;
  res.locals.csrfToken = req.csrfToken();
  next();
});

//get user from session 
app.use((req, res, next) => {
  // throw new Error('Sync Dummy');
  if (!req.session.user) {
    return next();
  }
  User.findById(req.session.user._id)
    .then(user => {
      if (!user) {
        return next();
      }
      req.user = user;
      next();
    })
    .catch(err => {
      next(new Error(err));
    });
});

//using imported routes and can filter them to start with any thing as /admin or not 
app.use('/admin', adminRoutes);
app.use(shopRoutes);
app.use(authRoutes);

app.get('/500', errorController.get500);

app.use(errorController.get404);

//error handler for data base and server throwing errors
app.use((error, req, res, next) => {
  // res.status(error.httpStatusCode).render(...);
  // res.redirect('/500');
  res.status(500).render('500', {
    pageTitle: 'Error!',
    path: '/500',
    isAuthenticated: req.session.isLoggedIn
  });
});

//init server
mongoose
  .connect(MONGODB_URI)
  .then(result => {
    app.listen(3000);
  })
  .catch(err => {
    console.log(err);
  });
