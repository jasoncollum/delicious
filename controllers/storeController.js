const mongoose = require('mongoose');
const Store = mongoose.model('Store');
const User = mongoose.model('User');
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
    req.body.author = req.user._id;
    const store = await (new Store(req.body)).save();
    req.flash('success', `Successfully Created ${store.name}.Care to leave a review ? `);
    res.redirect(`/store/${store.slug}`);
};

exports.getStores = async (req, res) => {
    // Query db for list of all stores
    const stores = await Store.find();
    res.render('stores', { title: 'stores', stores });
};

const confirmOwner = (store, user) => {
    if (!store.author.equals(user._id)) {
        throw Error('You must own a store in order to edit it!');
    }
}
exports.editStore = async (req, res) => {
    const store = await Store.findOne({ _id: req.params.id });
    confirmOwner(store, req.user);
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
    res.redirect(`/store/${store._id}/edit`);
};

exports.getStoreBySlug = async (req, res, next) => {
    const store = await Store.findOne({ slug: req.params.slug }).populate('author');
    if (!store) return next();
    res.render('store', { store, title: store.name });
};

exports.getStoresByTag = async (req, res) => {
    const tag = req.params.tag;  // current tag selection
    const tagQuery = tag || { $exists: true }; // if no tag, any store with a tag property
    const tagsPromise = Store.getTagsList();  // custom method we create in Store.js
    const storesPromise = Store.find({ tags: tagQuery }); // find when tags array includes tag
    const [tags, stores] = await Promise.all([tagsPromise, storesPromise]);
    res.render('tag', { tags, title: 'Tags', tag, stores });
};

exports.searchStores = async (req, res) => {
    const stores = await Store.find({
        $text: {
            $search: req.query.q
        }
    }, {
        score: { $meta: 'textScore' }  // project score property
    }).sort({
        score: { $meta: 'textScore' }  // sort score high to low
    }).limit(5);  // limit to 5 results - top 5 scores
    res.json(stores);
};

exports.mapStores = async (req, res) => {
    const coordinates = [req.query.lng, req.query.lat].map(parseFloat); // ...to numbers
    const q = {
        location: {
            $near: {
                $geometry: {
                    type: 'Point',
                    coordinates
                },
                $maxDistance: 10000  // 10,000 meters == 10 kilometers
            }
        }
    }

    const stores = await Store.find(q).select('slug name description location photo').limit(10);
    res.json(stores);
};

exports.mapPage = (req, res) => {
    res.render('map', { title: 'Map' });
};

exports.heartStore = async (req, res) => {
    const hearts = req.user.hearts.map(obj => obj.toString()); // make array of strings
    const operator = hearts.includes(req.params.id) ? '$pull' : '$addToSet'; // operator
    const user = await User
        .findByIdAndUpdate(req.user._id,
            { [operator]: { hearts: req.params.id } }, // operator = $pull or $addToSet
            { new: true }  // new: true -- returns user after updates
        );
    res.json(user);
};