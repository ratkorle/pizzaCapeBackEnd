const Order = require('../models/ordermodel');
const User = require('../models/user');
//const Custom = require('../models/custom');
//const Pizza = require('../models/pizza');
const userHelper = require('./../helper/user');
//const orderHelper = require('./../helper/order');
const waterfall = require('async-waterfall');
// const stripe = require("stripe")("sk_test_nYn7VxCUFzJJNZDmXoHFhpVo");


module.exports = function (router) {


    router.get('/order', userHelper.checkToken, function (req, res) {
        Order.find({ userId : req.user.id })
            .then(function (responseObj) {
                res.json({ data: responseObj});
            })
            .catch(function (err) {
                throw err;
            });
    });
    // Add items from Custom pizza menu
    // router.post('/add-to-cart/:order_id?', userHelper.checkToken, orderHelper.findLastOrder, function (req, res) {
    //     if (req.body.pizzaType && req.body.pizzaType === 'pizza') {
    //         Pizza.findOne({_id: req.body.id})
    //             .then(function (pizza) {
    //                 if (pizza && pizza.pizzaType === 'pizza') {
    //                     req.lastOrder.items.push({
    //                         quantity: req.body.quantity,
    //                         item: pizza._id,
    //                         name: pizza.name,
    //                         price: pizza.price
    //                     });
    //                     req.lastOrder.save().then(function () {
    //                         res.status(200).send('Successfully added');
    //                     });
    //                 }else{
    //                     res.status(500).send('Error');
    //                 }
    //             })
    //             .catch(function (err) {
    //                 throw err;
    //             })
    //     }
      /*  Order.findOne({ userId: req.user._id }, function (err, order) {

          /!*  order.items.push({
                item: req.body.custom_id,
                price: parseFloat(req.body.priceValue),
                quantity: parseInt(req.body.quantity)
            });

            order.total = (order.total + parseFloat(req.body.priceValue)).toFixed(2);

            order.save(function(err) {
                if (err) return next(err);
                return res.redirect('/order');*!/
            });
        });*/
  //  });
    //Add items from Pizza menu
/*    router.post('/add-to-cart/:pizza_id', function(req, res, next) {
        Order.findOne({ userId: req.user._id }, function(err, order) {
            order.items.push({
                item: req.body.pizza_id,
                price: parseFloat(req.body.priceValue),
                quantity: parseInt(req.body.quantity)
            });

            order.total = (order.total + parseFloat(req.body.priceValue)).toFixed(2);

            order.save(function(err) {
                if (err) return next(err);
                return res.redirect('/order');
            });
        });
    });*/
    // router.post('/remove-from-cart', userHelper.checkToken, orderHelper.findLastOrder, function(req, res, next) {
    //     Order.findOne({ userId: req.user._id }, function(err) {
    //         if (err) {
    //             return err;
    //         } else {
    //             findLastOrder.items.pull(String(req.body.item));
    //
    //             findLastOrder.total = (findLastOrder.total - parseFloat(req.body.price)).toFixed(2);
    //             findLastOrder.save(function (err) {
    //                 if (err) return next(err);
    //                 res.json({success: true, message: 'Successfully removed'});
    //                 res.redirect('/order');
    //             });
    //         }
    //     });
    // });
    router.post('/checkout', userHelper.checkToken, function(req, res, next) {

        const order = new Order();
        order.items = [];

        if(req.body.items && (req.body.items instanceof Array) === false) {
            res.send('You must provide items as array to create new Pizza');
        } else {
            order.items = req.body.items;
            order.total = req.body.total;
            order.save(function (err) {
                if (err) {
                    res.status(400).json({success: false, message: err});
                } else {
                    res.json({success: true, message: 'New Order has been made'});
                }
            });

        }
    });
    router.get('/allOrders', function (req, res) {
        Order.find({}, function (err, order) {
            if (err) {
                throw err;
            }

            res.send(order);
        });
    });
    router.put('/editOrder', userHelper.checkToken, function (req, res) {
       let editOrder = req.body.id;
        let newStatus = req.body.orderStatus;
       if (req.user.role !== admin)   {
           req.status(403).send('Insufficient Permissions');
       }  else {
           if (newStatus) {
               Order.findOne({ _id: editOrder }, function (err, order) {
                   if (err) throw err;
                   if (!order) {
                       res.json({ success: false, message: 'No order found'});
                   } else {
                       order.orderStatus = newStatus;
                       order.save(function (err) {
                           if (err) {
                               console.log(err);
                           } else {
                               res.json({ success: true, message:'Order Status changed'});
                           }
                       });
                   }
               });
           }
       }
    });

    return router;
};