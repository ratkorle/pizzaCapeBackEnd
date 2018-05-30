const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const Ingredients = require('./ingredients');

// BASIC Custom Pizza SCHEMA
const CustomSchema = new Schema({
    name: {type: String, default: 'Custom Pizza'},
    items: {type: String}, // array of ingredients
    price: {type: Number}
});

module.exports = mongoose.model('Custom', CustomSchema);