const passport = require('passport');

exports.login = passport.authenticate('local', {
    failuerRedirect: '/login',
    failureFlash: 'Failed Login!',
    successRedirect: '/',
    successFlash: 'You are now logged in!'
});