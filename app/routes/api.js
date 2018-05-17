const User = require('../models/user');
const jwt = require('jsonwebtoken'); // Keep user logged in using this library
const secret = 'polarCape';
const nodemailer = require('nodemailer');
const sgTransport = require('nodemailer-sendgrid-transport');

module.exports = function (router) {
    //SENDGRID information
    const options = {
        auth: {
            api_user: 'ratkorle',
            api_key: 'bamboleo'
        }
    };
    const client = nodemailer.createTransport(sgTransport(options));


    // USER REGISTRATION--------------------------------------------
    router.post('/users', function(req, res) {
        const user = new User();
        user.username = req.body.username;
    user.password = req.body.password;
    user.email = req.body.email;
    user.temporarytoken = jwt.sign({  username: user.username, email: user.email }, secret, {expiresIn: '24h' });
    if (req.body.username == null || req.body.username === '' || req.body.password == null || req.body.password === '' || req.body.email == null || req.body.email === '') {
        res.send('You must provide required information to continue');
    } else {
        user.save(function(err) {
            if (err) {
              if (err.errors != null) {                                                     // if there is null we don't want to do all the validation
                  if (err.errors.name) {
                      res.json({ success: false, message: err.errors.name.message});
                  } else if (err.errors.email) {
                      res.json({ success: false, message: err.errors.email.message});
                  } else if (err.errors.username) {
                      res.json({ success: false, message: err.errors.username.message});
                  } else if (err.errors.password) {
                      res.json({ success: false, message: err.errors.password.message});
                  } else {
                      res.json({ success: false, message: err });                            // In case we don't have problems with validation, we return the error whatever it is
                  }
              } else if (err){
                  if (err.code === 11000) {
                      res.json({ success: false, message: 'Username or E-mail already exist!' });
                  } else {
                      res.json({ success: false, message: err });
                  }
              }
            } else {
                const email = {
                    from: 'Pizza Made Staff, pizzamade@localhost.com',
                    to: user.email,
                    subject: 'Activation Link',
                    text: 'Hello' + user.name + 'Thank you for registering on our site. Please click on the link bellow to complete your activation:' +
                    'http://localhost:7000/activate/' + user.temporarytoken,
                    html: 'Hello<strong>' + user.name + '</strong>,<br><br>Thank you for registering on our site.' +
                    ' Please click on the link bellow to complete your activation:<br><br><a href="http://localhost:7000/activate' + user.temporarytoken + '">http://localhost:7000/activate</a>'
                };

                client.sendMail(email, function(err, info){
                    if (err ){
                        console.log(err);
                    }
                    else {
                        console.log('Message sent: ' + info.response);
                    }
                });
                res.json({ success: true, message:'User created. Please check your E-mail for confirmation link'});
            }
        });
      }
    });

    //USER LOGIN ---------------------------------------
    router.post('/authenticate', function (req, res) {
        User.findOne({ username: req.body.username }).select('email username password active').exec(function (err, user) {
            if (err) throw err;

            if (!user) {                                                                                                       // COMPARING IF USER EXIST IN THE DATABASE
                res.json({ success: false, message: 'Could not authenticate user'});
            } else if (user) {
                let validPassword;

                if (req.body.password) {
                    validPassword = user.comparePassword(req.body.password);
                } else {
                    res.json({ success: false, message: 'No password provided !!'});
                    return;
                }

                if (!validPassword) {
                    res.json({ success: false, message: 'Could not authenticate password'});  // after validation of the password we want check if account is active
                } else if (!user.active) {
                    res.json({ success: false, message: 'The account is not activated yet. Please check your E-mail for activation link', expired: true });
                } else {
                    const token = jwt.sign({username: user.username, email: user.email}, secret, {expiresIn: '24h'});  //(FRONTEND) we need to save this token in browser storage by implementing it in frontend auth -SERVICES
                    res.json({ success: true, message: 'User authenticated !', token: token});
                }
            }
        });
    });

    // CHECK USERNAME IF IT IS VALID
    router.post('/checkusername', function (req, res) {
        User.findOne({ email: req.body.email }).select('username').exec(function (err, user) {
            if (err) throw err;
            if (user) {
                res.json({ success: false, message: 'That username is already taken...' });
            } else {
                res.json({ success: true, message: 'Valid username.' });
            }
        });
    });
    // CHECK EMAIL IF IT IS VALID
    router.post('/checkemail', function (req, res) {
        User.findOne({ username: req.body.username }).select('email').exec(function (err, user) {
            if (err) throw err;
            if (user) {
                res.json({ success: false, message: 'That e-mail is already taken...' });
            } else {
                res.json({ success: true, message: 'Valid e-mail.' });
            }
        });
    });

    // ACTIVATION SUCCESS/Expired
    router.put('/activate/:token' , function (req, res) {
        User.findOne({ temporarytoken: req.params.token }, function (err, user) {                           //when user clicks on confirmation link its going to be in browser URL so with this we grab it and search the database
            if (err) throw err;
            const token = req.params.token;

            jwt.verify(token, secret, function(err) {                                                // here we verify that token we sent if its expired
                if (err) {
                    res.json({success: false, message: 'Activation link has expired'});                 // This happens when session is expired
                } else if (!user){                                                                      // If token is good but doesn't match the token of any user in the database
                    res.json({success: false, message: 'Activation link has expired'});
                } else {
                    user.temporarytoken = false;
                    user.active = true;
                    user.save(function (err) {
                        if (err) {
                            console.log(err);
                        }else {
                            const email = {                                                               // This email template is when user is activated
                                from: 'Pizza Made Staff, pizzamade@localhost.com',
                                to: user.email,
                                subject: 'Account Activated!',
                                text: 'Hello' + user.name + 'Your account has been successfully activated.',
                                html: 'Hello<strong>' + user.name + '</strong>,<br><br>Your account has been successfully activated.'
                            };

                            client.sendMail(email, function(err, info){
                                if (err ){
                                    console.log(err);
                                }
                                else {
                                    console.log('Message sent: ' + info.response);
                                }
                            });
                            res.json({success: true, message: 'Account activated !'});
                        }
                    });
                }

            });
        });
    });

    // RESEND CONFIRMATION LINK
    router.post('/resend', function (req, res) {
        User.findOne({ username: req.body.username }).select('username password active').exec(function (err, user) {
            if (err) throw err;

            if (!user) {                                                                                                       // COMPARING IF USER EXIST IN THE DATABASE
                res.json({ success: false, message: 'Could not authenticate user'});
            } else if (user) {
                let validPassword;

                if (req.body.password) {
                    validPassword = user.comparePassword(req.body.password);
                } else {
                    res.json({ success: false, message: 'No password provided !!'});
                    return;
                }

                if (!validPassword) {
                    res.json({ success: false, message: 'Could not authenticate password'});  // after validation of the password we want check if account is active
                } else if (user.active) {
                    res.json({ success: false, message: 'The account is already activated.' });
                } else {
                  res.json({ success: true, user: user });
                }
            }
        });
    });
    router.put('/resend', function (req, res) {
        User.findOne({ username: req.body.username }).select('username name email temporarytoken').exec(function (err, user) {
            if (err) throw err;
            user.temporarytoken = jwt.sign({  username: user.username, email: user.email }, secret, {expiresIn: '24h' });
            user.save( function (err) {
                if (err) {
                    console.log(err);
                } else {
                    const email = {
                        from: 'Pizza Made Staff, pizzamade@localhost.com',
                        to: user.email,
                        subject: 'Activation Link Request',
                        text: 'Hello' + user.name + 'Please click on the link bellow to complete your activation:' +
                        'http://localhost:7000/activate/' + user.temporarytoken,
                        html: 'Hello<strong>' + user.name + '</strong>,<br><br>' +
                        'Please click on the link bellow to complete your activation:<br><br><a href="http://localhost:7000/activate' + user.temporarytoken + '">http://localhost:7000/activate</a>'
                    };

                    client.sendMail(email, function(err, info){
                        if (err ){
                            console.log(err);
                        }
                        else {
                            console.log('Message sent: ' + info.response);
                        }
                    });
                   res.json({ success: true, message: 'Activation link has been sent to ' + user.email });
                }
            });
        });
    });

    // RESET USERNAME
    router.get('/resetusername/:email', function (req, res) {
        User.findOne({ email: req.params.email }).select('email name username').exec(function (err, user) {
            if (err) {
                res.json({ success: false, message: err });
            } else {
                if (!req.params.email) {
                    res.json({ success: false, message: 'No e-mail was provided' });
                } else {
                    if (!user) {
                        res.json({ success: false, message: 'E-mail was not found' });
                    } else {
                        const email = {
                            from: 'Pizza Made Staff, pizzamade@localhost.com',
                            to: user.email,
                            subject: 'Username Request',
                            text: 'Hello' + user.name + 'This  is request for your username. Your username is bellow:' + user.username,
                            html: 'Hello<strong>' + user.name + '</strong>,<br><br>' +
                            'This  is request for your username. Your username is bellow:<br><br> ' + user.username
                        };

                        client.sendMail(email, function(err, info){
                            if (err ){
                                console.log(err);
                            }
                            else {
                                console.log('Message sent: ' + info.response);
                            }
                        });
                        res.json({ success: true, message: 'Your username has been sent to' + user.email })
                    }
                }

            }
        });
    });

    // RESET PASSWORD
    router.put('/resetpassword', function (req, res) {
        User.findOne({ username: req.body.username }).select('username active email resettoken name').exec(function (err, user) {
            if (err) throw err;
            if (!user) {
                res.json({ success: false, message: 'Username not found.' });
            } else if (!user.active) {
                res.json({ success: false, message: 'Account has not yet been activated!' });
            } else {
                user.resettoken = jwt.sign({  username: user.username, email: user.email }, secret, {expiresIn: '24h' });
                user.save(function (err) {
                    if (err) {
                        res.json({ success: false, message: err });
                    } else {
                        const email = {
                            from: 'Pizza Made Staff, pizzamade@localhost.com',
                            to: user.email,
                            subject: 'Reset Password Request',
                            text: 'Hello' + user.name + 'You recently requested a password reset link. Please click on the link bellow to reset your password:' + 'http://localhost:7000/newpassword/' +
                            user.resettoken,
                            html: 'Hello<strong>' + user.name + '</strong>,<br><br>You recently requested a password reset link. Please click on the link bellow to reset your password:<br><br>' +
                            '<a href="http://localhost:7000/newpassword/"></a>' + user.resettoken
                        };

                        client.sendMail(email, function(err, info){
                            if (err ){
                                console.log(err);
                            }
                            else {
                                console.log('Message sent: ' + info.response);
                            }
                        });

                        res.json({ success: true, message: 'Please check your email for password reset link' });
                    }
                })
            }
        });
        // GET WHO IS RESETING THE PASSWORD
        router.get('/resetpassword/:token', function (req, res) {
            User.findOne({ resettoken: req.params.token }).select().exec(function (err, user) {
                if (err) throw err;
                const token = req.params.token;
                jwt.verify(token, secret, function(err) {
                    if (err) {
                        res.json({success: false, message: 'Password link has expired'}); // This happens when session is expired
                    } else {
                      if (!user) {
                          res.json({success: false, message: 'Password link has expired'});
                      } else {
                          res.json({ success: true, user: user });
                      }
                    }
                });
            })
        });

        //SAVE NEW PASSWORD
        router.put('/savepassword/', function (req, res) {
            User.findOne({ username: req.body.username }).select('username name email password resettoken').exec(function (err, user) {
               if (err) throw err;
              if (req.body.password == null || req.body.password === '') {
                  res.json({ success: false, message: 'Password not provided' });
              } else {
                  user.password = req.body.password;
                  user.resettoken = false;
                  user.save(function (err) {
                      if (err) {
                          res.json({ success: false, message: err });
                      } else {
                          const email = {
                              from: 'Pizza Made Staff, pizzamade@localhost.com',
                              to: user.email,
                              subject: 'Reset Password Request',
                              text: 'Hello' + user.name + 'Your password has been changed',
                              html: 'Hello<strong>' + user.name + '</strong>,<br><br>Your password has been changed<br><br>'
                          };

                          client.sendMail(email, function(err, info){
                              if (err ){
                                  console.log(err);
                              }
                              else {
                                  console.log('Message sent: ' + info.response);
                              }
                          });

                          res.json({ success: true, message: 'Password has been reset!' })
                      }
                  });
              }
            });
        });
    });

    //Create Middleware for token
    router.use(function (req, res, next) {
        const token = req.body.token || req.body.query || req.headers['x-access-token']; // Get from REQUEST or URL or HEADERS

        if (token) {
            // verify a token symmetric
            jwt.verify(token, secret, function(err, decoded) {
                if (err) {
                    res.json({success: false, message: 'Token invalid'}); // This happens when session is expired
                } else {
                    req.decoded = decoded;                                  //decoded basically takes the token combines with the SECRET, verifies it nad once its good it sends back decoded and sends back username and email
                    next();
                }

            });
        } else {
            res.json({ success: false, message: 'No token provided'});
        }
    });

    router.post('/me', function (req, res) {
        res.send(req.decoded);
    });










    return router;
}; // Module exports router

