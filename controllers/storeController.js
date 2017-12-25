const mongoose = require("mongoose");
const Store = mongoose.model("Store");
const multer = require("multer");
const jimp = require("jimp");
const uuid = require("uuid");

const multerOptions = {
  storage: multer.memoryStorage(),
  fileFilter(req, file, next) {
    const isPhoto = file.mimetype.startsWith("image/");
    if (isPhoto) {
      next(null, true);
    } else {
      next({ message: "That filetype isn't allowed!" }, false);
    }
  }
};

exports.homePage = (req, res) => {
  res.render("index");
};

exports.addStore = (req, res) => {
  res.render("editStore", { title: "Add Store" });
};

exports.upload = multer(multerOptions).single("photo");

exports.resize = async (req, res, next) => {
  // Check if there is no new file to resize
  if (!req.file){
    next(); // skip to the next middleware
    return;
  }
  const extension = req.file.mimetype.split("/")[1];
  // Give the file a unique name
  req.body.photo = `${uuid.v4()}.${extension}`;
  // Resize the picture (provisionally in buffer)
  const photo = await jimp.read(req.file.buffer);
  await photo.resize(800, jimp.AUTO);
  await photo.write(`./public/uploads/${req.body.photo}`);
  // Once the photo is stored, keep going
  next();
};

exports.createStore = async (req, res) => {
  req.body.author = req.user._id;
  const store = await (new Store(req.body)).save();
  req.flash("success", `Successfully created <strong>${store.name}</strong>. Care to leave a review?`);
  res.redirect(`/store/${store.slug}`);
};

exports.getStores = async (req, res) => {
  // 1. Query the database for a list of all stores
  const stores = await Store.find();
  res.render("stores", { title: "Stores", stores });
};

const confirmOwner = (store, user) => {
  if(!store.author.equals(user._id)) {
    throw Error('You must own a store in order to edit it!');
  }
}

exports.editStore = async (req, res) => {
  // 1. Find the store given the ID
  const store = await Store.findOne({ _id: req.params.id });
  // 2. Confirm the user is the store's owner
  confirmOwner(store, req.user);
  // 3. Render out the edit form
  res.render("editStore", { title: `Edit ${store.name}`, store });
};

exports.updateStore = async (req, res) => {
  // 0. Set the location data to be a point (default only applies with new data)
  req.body.location.type = "Point";
  // 1. Find and update the store
  const store = await Store.findOneAndUpdate({ _id: req.params.id }, req.body, { 
    new: true, // return the new store instead of the old one
    runValidators: true // by default, validators only run on creation
  }).exec();
  // 2. Redirect them to the store and tell it worked
  req.flash("succes", `Successfully updated <strong>${store.name}</strong>. <a href="/stores/${store.slug}">View Store</a>`);
  res.redirect(`/stores/${store._id}/edit`);
};

exports.getStoreBySlug = async (req, res, next) => {
  const store = await Store.findOne({ slug: req.params.slug }).populate('author');
  if(!store) return next();
  res.render("store", { title: store.name, store });
};

exports.getStoresByTag = async (req, res) => {
  const tag = req.params.tag;
  const tagQuery = tag || { $exists: true};
  const tagsPromise = Store.getTagsList();
  const storesPromise = Store.find({ tags: tagQuery });
  // Wait until all the promises are finished
  const [tags, stores] = await Promise.all([tagsPromise, storesPromise]);
  res.render("tags", { title: "Tags", tag, tags, stores });
};
