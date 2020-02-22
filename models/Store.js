const mongoose = require('mongoose');
mongoose.Promise = global.Promise;
const slug = require('slugs');

const storeSchema = new mongoose.Schema({
    name: {
        type: String,
        trim: true,
        required: 'Please enter a store name!'
    },
    slug: String,
    description: {
        type: String,
        trim: true
    },
    tags: [String],
    created: {
        type: Date,
        default: Date.now
    },
    location: {
        type: {
            type: String,
            default: 'Point'
        },
        coordinates: [{
            type: Number,
            required: 'You must supply coordinates!'
        }],
        address: {
            type: String,
            required: 'You must supply an address!'
        }
    },
    photo: String,
    author: {
        type: mongoose.Schema.ObjectId,
        ref: 'User',
        required: 'You must supply an author'
    }
}, {
    toJSON: { virtuals: true }, // virtuals only populate to JSON or Objects if marked true
    toObject: { virtuals: true }

});

// Define our indexes
storeSchema.index({
    name: 'text',
    description: 'text'
});

storeSchema.index({ location: '2dsphere' });

// -----
storeSchema.pre('save', async function (next) {
    if (!this.isModified('name')) {
        next();
        return;
    }
    this.slug = slug(this.name);
    // find other stores that have slug of slug, slug-1, slug-2, etc.
    const slugRegEx = new RegExp(`^(${this.slug})((-[0-9]*$)?)$`, 'i');
    const storesWithSlug = await this.constructor.find({ slug: slugRegEx });
    if (storesWithSlug.length) {
        this.slug = `${this.slug}-${storesWithSlug.length + 1}`;
    }
    next();
})

storeSchema.statics.getTagsList = function () {
    return this.aggregate([
        { $unwind: '$tags' },
        { $group: { _id: '$tags', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
    ]);
}

storeSchema.statics.getTopStores = function () {
    return this.aggregate([
        // Look up stores and populate their reviews (merge the review docs with store doc)... MongoDB will take the model name Review, lowercase it and add an s to make it plural = that's where <from: 'reviews'> comes from
        {
            $lookup: {
                from: 'reviews', // what model to link
                localField: '_id', // which field on the store
                foreignField: 'store', // which field on the review
                as: 'reviews' // naming the new field 'reviews'
            }
        },
        // Filter for only items with 2 or more reviews
        // Match documents WHERE the 2nd item in reviews exists
        {
            $match: { 'reviews.1': { $exists: true } }
        },
        // Add the average reviews field
        // Create a new field called averageRating, then set it's value to the average of each review's rating field
        {
            $project: {  // replace $project with $addField and photo, name, reviews auto add ???
                photo: '$$ROOT.photo', // add store name, photo, reviews, slug
                name: '$$ROOT.name',
                reviews: '$$ROOT.reviews',
                slug: '$$ROOT.slug',
                averageRating: { $avg: '$reviews.rating' } // $ means a field from added data 
            }
        },
        // Sort it - heighest reviews first
        { $sort: { averageRating: - 1 } },
        // limit to at most 10
        { $limit: 10 }
    ])
}

// Find reviews where the stores _id property === reviews store property (similar to a Join)
// *** Not avaibable to use in aggregate method in getTopStores above ***
storeSchema.virtual('reviews', {
    ref: 'Review',  // what model to link
    localField: '_id',  // which field on the store
    foreignField: 'store' // which field on the review
});

// autopopulate / add reviews to stores
function autopopulate(next) {
    this.populate('reviews');
    next();
}

storeSchema.pre('find', autopopulate);
storeSchema.pre('findOne', autopopulate);

module.exports = mongoose.model('Store', storeSchema);