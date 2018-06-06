const Order = require('../models/ordermodel');
const User = require('../models/user');
const userHelper = require('./../helper/user');


module.exports = function (router) {
    router.post('/order/add', userHelper.checkToken, function (req, res) {
    });

    router.post('/order', userHelper.checkToken, function (req, res) {
        const order = new Order();
        userID = req.user.id;
        order.items = [];

        if (req.body.items && (req.body.items instanceof Array) === false) {
            res.send('You must provide items as array to create new Order');
        } else {
            order.items = req.body.items;
            order.price = 0;
            order.save(function (err) {
                if (err) {
                    res.status(400).json({ success: false, message: err });
                } else {
                    res.json({ success: true, message: 'Order Created' });
                }
            });
         }
    });

    router.get('/dashboard', function(req, res) {
        Order.find({'userId.id': req.user._id}, (err, orders) => {
            if(err) {
                console.log(err);
            } else {
                res.send(orders);
            }
        });
    });
    return router;
};