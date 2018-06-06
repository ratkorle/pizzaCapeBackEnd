const Order = require('../models/ordermodel');
const User = require('../models/user');


module.exports = function (router) {
    router.post('/order', function (req, res) {
    const order = new Order();
    console.log(req.body);
    userID = user_id;
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