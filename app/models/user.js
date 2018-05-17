var mongoose    = require('mongoose');
var Schema      = mongoose.Schema;
var bcrypt      = require('bcrypt-nodejs');
var titlize     = require('mongoose-title-case');
var validate    = require('mongoose-validator');

// VALIDATORS
var nameValidator = [
    validate({
        validator: 'matches',
        arguments: /^(([a-zA-Z]{3,20})+[ ]+([a-zA-Z]{3,20})+)+$/,   //Regular Expression for First Name and Last name that must be alphabetic 3-20 characters and space between them.
        message: 'No special characters or numbers allowed. You have to provide first name and last name with space between them!'
    }),
    validate({
        validator: 'isLength',
        arguments: [3, 30],
        message: 'Name should be between {ARGS[0]} and {ARGS[1]} characters'
    })
];
var emailValidator = [
    validate({
        validator: 'isEmail',
        message: 'You have to provide valid e-mail !'
    }),
    validate({
        validator: 'isLength',
        arguments: [3, 35],
        message: 'E-mail should be between {ARGS[0]} and {ARGS[1]} characters'
    })
];
var usernameValidator = [
    validate({
        validator: 'isLength',
        arguments: [5, 30],
        message: 'Username must be at least 5 characters long'
    }),
    validate({
        validator: 'isAlphanumeric',
        message: 'Name should contain alpha-numeric characters only'
    })
];
var passwordValidator = [
    validate({
        validator: 'matches',
        arguments: /^([1-zA-Z0-1@.\s]{5,25})$/,
        message: 'No special characters and spaces allowed. Password should be 6 to 24 characters long!'
    }),
    validate({
        validator: 'isLength',
        arguments: [5, 25],
        message: 'Name should be between {ARGS[0]} and {ARGS[1]} characters'
    })
];


// BASIC USERNAME SCHEMA
var UserSchema = new Schema({
    name: {type: String, required: true, validate: nameValidator},
    username:  {type: String, lowercase: true, required: true, unique: true, validate: usernameValidator},
    password: {type: String, required: true, validate: passwordValidator, select: false},
    email: {type: String, required: true, lowercase: true, unique: true, validate: emailValidator},
    active: { type: Boolean, required: true, default: false },
    temporarytoken: { type: String, required: true},
    resettoken: { type: String, required: false }
});

// SETTING UP PASSWORD PROTECTION USING BCRYPT
UserSchema.pre('save', function(next) {
    var user = this;
    if (!user.isModified('password')) return next();                // If password is not touched don't do this function
    bcrypt.hash(user.password, null, null, function(err, hash) {
      if (err) return next(err);
      user.password = hash;
        next();
    });

});
// Mongoose TiTle Case Schema
UserSchema.plugin(titlize, {
    paths: [ 'name']
});

// METHOD FOR VALIDATING THE PASSWORD (compare)
UserSchema.methods.comparePassword = function (password) {
  return bcrypt.compareSync(password, this.password);
};




module.exports = mongoose.model('User', UserSchema);


