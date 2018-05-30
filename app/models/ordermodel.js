const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// BASIC Order SCHEMA
const OrderSchema = new Schema({
    //default mongo order ID
    userId: {user.id} // user id
    //date.time
    //items - array of items  pizza and custom
   //status - default OPEN
// total price - total price of custom and pizza
});

module.exports = mongoose.model('Order', OrderSchema);