const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// BASIC Pizza SCHEMA
const PizzaSchema = new Schema({
    name: {type: String, required: true},
    items: {type: String}, //array of ingridients
    price: {type: Number}
});

module.exports = mongoose.model('Pizza', PizzaSchema);