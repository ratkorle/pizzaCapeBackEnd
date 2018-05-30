const User = require('../models/user');
const config = require('./config');

/* Exports */
module.exports.initializeAdmin = initializeAdmin;

function initializeAdmin() {
    User.findOne({
        username: config.admin.username
    }).then((data) => {
        if(!data){
            let user = new User(config.admin);
            return user.save();
        }
    }).catch((err) => {
        throw err;
    });
}