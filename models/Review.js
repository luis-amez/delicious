const mongoose = require('mongoose');
mongoose.Promise = global.Promise;

const reviewSchema = new mongoose.Schema({
  created: {
    type: Date,
    default: Date.now
  },
  rating: {
    type: Number,
    min: 1,
    max: 5
  },
  text: {
    type: String,
    trim: true,
    required: 'You review must have text!'
  },
  author: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: 'You must supply an author!'
  },
  store: {
    type: mongoose.Schema.ObjectId,
    ref: 'Store',
    required: 'You must supply a store!'
  }
});

module.exports = mongoose.model('Review', reviewSchema);