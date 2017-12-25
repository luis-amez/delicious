const passport = require("passport");
const crypto = require("crypto");
const mongoose = require("mongoose");
const User = mongoose.model("User");
const promisify = require("es6-promisify");
const mail = require('../handlers/mail');

exports.login = passport.authenticate("local", {
  failureRedirect: "/login",
  failureFlash: "Failed login!",
  successRedirect: "/",
  successFlash: "You are now logged in!"
});

exports.logout = (req, res) => {
  req.logout();
  req.flash("success", "You are now logged out!");
  res.redirect("/");
};

exports.isLoggedIn = (req, res, next) => {
  if (req.isAuthenticated()) {
    next();
    return;
  }
  req.flash("error", "Ooops! You must be logged in to do that.");
  res.redirect("/login");
};

exports.forgot = async (req, res) => {
  // 1. See if a user with that email exists
  const user = await User.findOne({ email: req.body.email });
  if(!user) {
    req.flash("success", "A password reset has been mailed to you.");
    return res.redirect("/login");
  }
  // 2. Set reset tokens and expiry on their account
  user.resetPasswordToken = crypto.randomBytes(20).toString('hex');
  user.resetPasswordExpires = Date.now() + 3600000; // 1 hour from now
  await user.save();
  // 3. Send them an email with the token
  const resetURL = `http://${req.headers.host}/account/reset/${user.resetPasswordToken}`;
  await mail.send({
    user,
    subject: 'Password Reset',
    resetURL,
    filename: 'password-reset'
  })
  req.flash("success", `A password reset has been mailed to you.`);  
  // 4. Redirect to login page
  res.redirect("/login");
};

exports.reset = async (req, res) => {
  const user = await User.findOne({
    resetPasswordToken: req.params.token,
    resetPasswordExpires: { $gt: Date.now() }  
  });

  if(!user) {
    req.flash("error", "Password reset token is invalid or has expired.");
    return res.redirect("/login");
  }

  res.render("reset", { title: "Reset Your Password" });
};

exports.confirmedPasswords = (req, res, next) => {
  if(req.body.password === req.body["password-confirm"]) {
    next();
    return;
  }
  req.flash("error", "Passwords do not match!");
  res.redirect("back");
};

exports.update = async (req, res) => {
  const user = await User.findOne({
    resetPasswordToken: req.params.token,
    resetPasswordExpires: { $gt: Date.now() }  
  });

  if(!user) {
    req.flash("error", "Password reset token is invalid or has expired.");
    return res.redirect("/login");
  }

  const setPassword = promisify(user.setPassword, user);
  await setPassword(req.body.password);

  user.resetPasswordToken = undefined;
  user.resetPasswordExpires = undefined;
  const updatedUser = await user.save();
  
  await req.login(updatedUser);
  req.flash("success", "Your password has been reset!");
  res.redirect("/");
};