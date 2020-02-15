const mongoose = require('mongoose');
const Store = mongoose.model('Store');
const multer = require('multer');
const jimp = require('jimp');
const uuid = require('uuid');

const multerOptions = {
    storage: multer.memoryStorage(),
    fileFilter(req, file, next) {
        const isPhoto = file.mimetype.startsWith('image/');
        if (isPhoto) {
            next(null, true);
        } else {
            next({ message: 'That filetype isn\'t allowed!' }, false);
        }
    }
};

exports.homePage = (req, res) => {
    res.render('index');
};

exports.addStore = (req, res) => {
    res.render('editStore', { title: 'Add Store' });
};

// Photo file upload middleware
exports.upload = multer(multerOptions).single('photo');
exports.resize = async (req, res, next) => {
    if (!req.file) {
        next(); // skip to next middleware
        return;
    }
    const extension = req.file.mimetype.split('/')[1];
    req.body.photo = `${uuid.v4()}.${extension}`;
    // Resize and write to uploads folder
    const photo = await jimp.read(req.file.buffer);
    await photo.resize(800, jimp.AUTO);
    await photo.write(`./public/uploads/${req.body.photo}`);
    next();
};

exports.createStore = async (req, res) => {
    const store = await (new Store(req.body)).save();
    req.flash('success', `Successfully Created ${store.name}.Care to leave a review ? `);
    res.redirect(`/ store / ${store.slug} `);
};

exports.getStores = async (req, res) => {
    // Query db for list of all stores
    const stores = await Store.find();
    res.render('stores', { title: 'stores', stores });
};

exports.editStore = async (req, res) => {
    const store = await Store.findOne({ _id: req.params.id });

    res.render('editStore', { title: `Edit ${store.name} `, store });
};

exports.updateStore = async (req, res) => {
    // Set location data to be a point
    req.body.location.type = 'Point';
    // Find and update store
    const store = await Store.findOneAndUpdate(
        { _id: req.params.id },
        req.body,
        { new: true, runValidators: true }
    ).exec();
    req.flash('success', `Successfully Updated ${store.name}.<a href='/stores/${store.slug}'>View Store</a>`);
    res.redirect(`/ store / ${store._id} /edit`);
};

exports.getStoreBySlug = async (req, res, next) => {
    const store = await Store.findOne({ slug: req.params.slug });
    if (!store) return next();
    res.render('store', { store, title: store.name });
};