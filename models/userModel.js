const crypto = require('crypto'); // built-in
const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcryptjs');
//const catchAsync = require('../utils/catchAsync');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please tell us your name!'],
  },
  email: {
    type: String,
    required: [true, 'Please provide your email!'],
    unique: true,
    lowercase: true,
    // NOT A VALIDATOR! Just converts the string into lowercase.
    validate: [validator.isEmail, 'Please provide a valid email address!'],
  },
  photo: {
    type: String,
    default: 'default.jpg',
  },
  role: {
    type: String,
    enum: ['user', 'guide', 'lead-guide', 'admin'],
    default: 'user',
  },
  password: {
    type: String,
    required: [true, 'Please provide a password'],
    minlength: 8,
    select: false,
    // we do not want to show the password when the User collection is queried, even though we have encrypted the password.
  },
  passwordConfirm: {
    type: String,
    required: [true, 'Please confirm your password!'],
    validate: {
      // This will only work on SAVE and CREATE!!! So, whenever we update a user, we have to use save() or create() there as well, not just findOneAndUpdate et al
      validator: function (value) {
        return value === this.password;
      },
      message: 'Passwords do not match!',
    },
  },
  passwordChangedAt: {
    type: Date,
  },
  passwordResetToken: String,
  passwordResetExpires: Date,
  active: {
    type: Boolean,
    default: true,
    select: false,
  },
});

// document middleware (before save)
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    // 'this' refers to the current document before it is persisted to the database.
    return next();
    // password isn't modified, then there is no need to encrypt it again. For example, if a user is only updating his/her email and not the password, then we have no need to encrypt the password again.
  }
  this.password = await bcrypt.hash(this.password, 12);
  // hash(property, basically a number to specify how strong the encryption should be at the cost of CPU power, AKA cost parameter. 12 is good for us.)
  this.passwordConfirm = undefined;
  // we of course do not want to save the password two times in the database. We only required the passwordConfirm property so that the user could input the password two times and validate whether what was inputted is exactly what he/she had in mind. So, basically, the passwordConfirm field was for validation purposes. After validation is done, we no longer require it. So, we DELETE the field from the database. In order to delete a field from the database, we just set it to undefined.
  // We might wonder how this works since passwordConfirm was actually required. But, the thing is, what was required was inputting the passwordConfirm. It is not required to actually persist it in the database.
  next();
});

userSchema.pre('save', function (next) {
  if (!this.isModified('password') || this.isNew) {
    // we do not want to set the passwordChangedAt property if the password hasn't been modified or if the document is newly created. We can't simply just use isModified() here because it works for new documents too.
    return next();
  }
  this.passwordChangedAt = Date.now() - 1000;
  // we have subracted 1s from the time because sometimes, the JWT is issued a bit earlier and the passwordChangedAt property is set a bit later, due to slow operation of the database compared to the JWT issuing. Because of this, as the token is issued BEFORE the password was changed, it isn't valid anymore. That is why, to rectify this, we subtract 1s from the passwordChangedAt so that the token is issued after the passwordChangedAt has been reflected in the database.
  next();
});

userSchema.pre(/^find/, function (next) {
  // query middleware, so 'this' points to current query.
  this.find({ active: { $ne: false } });
  next();
});

userSchema.methods.correctPassword = async function (
  candidatePassword,
  userPassword
) {
  return await bcrypt.compare(candidatePassword, userPassword);
};
// above method is an instance method. It is a method that is available on all the documents of a certain collection. Here, 'this' points to the current document. You might be thinking, that since 'this' refers to the current document, then why not just get the userPassword as this.password, and not pass it as an argument. This is because as the password's select is set to false, it is therefore not available using this.password. So, we have to pass it in as an argument.

userSchema.methods.changedPasswordAfter = function (JWTTimestamp) {
  // JWTTimestamp is when the token was issued.
  if (this.passwordChangedAt) {
    // if this property exists for the user, i.e. he/she has changed the password sometime, then execute this block. If password was never changed, then we just return false.
    const changedTimestamp = parseInt(
      this.passwordChangedAt.getTime() / 1000,
      // converts the date into numbers (seconds)
      10 // BASE 10
    );
    return JWTTimestamp < changedTimestamp; // checking whether token was issued BEFORE password was changed. If it was, then return true.
    // For example, if JWT was issued at 100, and password was changed at 200, then 100 < 200, and return true.
  }
  return false;
  // false means user did not change password after token was issued.
};

userSchema.methods.createPasswordResetToken = function () {
  const resetToken = crypto.randomBytes(32).toString('hex'); // 32 = Number of characters. Convert this string to hexadecimal string.
  this.passwordResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');
  // encrypt the token.
  this.passwordResetExpires = Date.now() + 10 * 60 * 1000;
  // reset token will expire in 10 minutes
  return resetToken;
};

const User = mongoose.model('User', userSchema);

module.exports = User;
