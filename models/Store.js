const mongoose = require("mongoose");
mongoose.Promise = global.Promise;
const slug = require("slugs");

const storeSchema = new mongoose.Schema({
  name: {
    type: String,
    trim: true,
    required: "You must supply a store name!"
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
      default: "Point",
    },
    coordinates: [{
      type: Number,
      required: "You must supply coordinates!"
    }],
    address: {
      type: String,
      required: "You must supply an address!"
    }
  },
  photo: String,
  author: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: 'You must supply an author'
  }
}, {
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Define indexes
storeSchema.index({
  name: 'text',
  description: 'text'
});

storeSchema.index({ location: '2dsphere' });

storeSchema.pre("save", async function(next) {
  if (!this.isModified("name")) {
    next(); // skip it
    return; // stop this function from running
  }
  this.slug = slug(this.name);
  // Find other stores with the same slug
  const slugRegEx = new RegExp(`^(${this.slug})((-[0-9]*$)?)$`, 'i');
  const storesWithSlug = await this.constructor.find({ slug: slugRegEx });
  // If there are other stores with the same slug, add number at the end
  if (storesWithSlug.length) {
    this.slug = `${this.slug}-${storesWithSlug.length + 1}`;
  }
  next();
  // TODO make more resiliant so slugs are unique
});

storeSchema.statics.getTagsList = function() {
  return this.aggregate([
    { $unwind: "$tags" },
    { $group: { _id: "$tags", count: { $sum: 1 }}},
    { $sort: { count: -1 }}
  ]);
};

storeSchema.statics.getTopStores = function() {
  return this.aggregate([
    // Find stores and populate their reviews
    { $lookup: 
      { from: 'reviews', localField: '_id', foreignField: 'store', as: 'reviews' }
    },
    // Filter for stores with 2 or more reviews
    { $match: 
      { 'reviews.1': { $exists: true } } 
    },
    // Add the average field
    { $addFields: 
      { averageRating: { $avg: '$reviews.rating' } } 
    },
    // Sort by average (higher first)
    { $sort: 
      { averageRating: -1 } 
    },
    // Limit to 10 results
    { $limit: 10 }
  ]);
};

// Populate this virtual field with reviews where the store property is equal to the _id of this store
storeSchema.virtual('reviews', {
  ref: 'Review',
  localField: '_id',
  foreignField: 'store'
});

function autopopulate(next) {
  this.populate('reviews');
  next();
}

storeSchema.pre('find', autopopulate);
storeSchema.pre('findOne', autopopulate);

module.exports = mongoose.model("Store", storeSchema);

