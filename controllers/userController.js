const mongoose = require('mongoose');
const User = mongoose.model('User');
const promisify = require('es6-promisify');

exports.loginForm = (req, res) => {
    res.render('login', { title: 'Login' });
};

exports.registerForm = (req, res) => {
    res.render('register', { title: 'Register' });
};

// Middleware
exports.validateRegister = (req, res, next) => {
    req.sanitizeBody('name');
    req.checkBody('name', 'You must supply a name!').notEmpty();
    req.checkBody('email', 'That email is not valid!').isEmail();
    req.sanitizeBody('email').normalizeEmail({
        remove_dots: false,
        remove_extension: false,
        gmail_remove_subaddress: false
    });
    req.checkBody('password', 'Password cannot be blank!').notEmpty();
    req.checkBody('password-confirm', 'Confirmed Password cannot be blank!').notEmpty();
    req.checkBody('password-confirm', 'Oops! Your passwords do not match').equals(req.body.password);

    const errors = req.validationErrors();
    if (errors) {
        req.flash('error', errors.map(err => err.msg));
        req.render('register', {
            title: 'Register',
            body: req.body,
            flashes: req.flash()
        });
        return;  // Stop the function from running
    }
    next();  // There were no errors!
};

exports.register = async (req, res, next) => {
    const user = new User({ email: req.body.email, name: req.body.name });
    // Promisify: pass it method to promisfy, object to bind to
    const register = promisify(User.register, User);
    // call the promisified method
    await register(user, req.body.password);
    // pass to authController.login
    next();
};

exports.account = (req, res) => {
    res.render('account', { title: 'Edit your account' });
};

exports.updateAccount = async (req, res) => {
    const updates = {
        name: req.body.name,
        email: req.body.email
    };

    const user = await User.findOneAndUpdate(
        { _id: req.user._id },  // the query
        { $set: updates },      // the updates
        {                       // the options
            new: true,
            runValidators: true,
            context: 'query'
        }
    );
    req.flash('success', 'Profile updated!');
    res.redirect('/account');   // also redirect('back') to return to url came from
};