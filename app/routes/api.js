const User = require('../models/user');
const jwt = require('jsonwebtoken'); // Keep user logged in using this library
const secret = 'polarCape';
const nodemailer = require('nodemailer');
const sgTransport = require('nodemailer-sendgrid-transport');

module.exports = function (router) {
    // Start Sendgrid Configuration Settings (Use only if using sendgrid)
    //SENDGRID information
    //  const options = {
    //    auth: {
    //        api_user: 'ratkorle',
    //        api_key: 'bamboleo123'
    //    }
    //    };

    const client = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: 'ratko.korlevski@gmail.com', // Your email address
            pass: 'teatar' // Your password
        },
        tls: { rejectUnauthorized: false }
    });
   //const client = nodemailer.createTransport(sgTransport(options)); // Use if using sendgrid configuration


    // USER REGISTRATION--------------------------------------------
    router.post('/users', function(req, res) {
        const user = new User();                    // Create new User object
        user.name = req.body.name;                   // Save name from request to User object
        user.username = req.body.username;          // Save username from request to User object
        user.password = req.body.password;          // Save password from request to User object
        user.email = req.body.email;                // // Save email from request to User object
        user.temporarytoken = jwt.sign({  username: user.username, email: user.email }, secret, {expiresIn: '24h' });   // Create a token for activating account through e-mail

        // Check if request is valid and not empty or null
        if (req.body.name === null || req.body.name === '' || req.body.username === null || req.body.username === '' || req.body.password === null || req.body.password === '' || req.body.email === null || req.body.email === '') {
            res.send('You must provide required information to continue');
        } else {
            // Save new user to database
            user.save(function(err) {
                if (err) {                                                                           // Check if any validation errors exists (from user model)
                  if (err.errors !== null) {                                                     // if there is null we don't want to do all the validation
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
                  } else if (err){                                                                 // Check if duplication error exists
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
                        html: 'Hello <strong>' + user.name + '</strong>,<br><br>Thank you for registering on our site.' +
                        ' Please click on the link bellow to complete your activation:<br><br><a href="http://localhost:7000/activate/' + user.temporarytoken + '">http://localhost:7000/activate</a>'
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
        const loginUser = (req.body.username).toLowerCase(); // Ensure username is checked in lowercase against database
        User.findOne({ username: loginUser }).select('email username password active').exec(function (err, user) {
            if (err) throw err;

            if (!user) {                                                                                                       // COMPARING IF USER EXIST IN THE DATABASE
                res.json({ success: false, message: 'User does not exist'});                     // Username not found in database
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
        User.findOne({ username: req.body.username }).select('username').exec(function (err, user) {
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
        User.findOne({ email: req.body.email }).select('email').exec(function (err, user) {
            if (err) throw err;
            if (user) {
                res.json({ success: false, message: 'That e-mail is already taken...' });
            } else {
                res.json({ success: true, message: 'Valid e-mail.' });
            }
        });
    });

    // ACTIVATION SUCCESS/Expired
    router.get('/activate/:token' , function (req, res) {
        User.findOne({ temporarytoken: req.params.token }, function (err, user) {                           //when user clicks on confirmation link its going to be in browser URL so with this we grab it and search the database
            if (err) throw err;
            const token = req.params.token;                                                         // Save the token from URL for verification

            jwt.verify(token, secret, function(err, token) {                                                // here we verify that token we sent if its expired
                if (err) {
                    res.json({success: false, message: 'Activation link has expired'});                 // This happens when session is expired
                } else if (!user){                                                                      // If token is good but doesn't match the token of any user in the database
                    res.json({success: false, message: 'Activation link has expired'});
                } else {
                    user.temporarytoken = false;    // Remove temporary token
                    user.active = true;             // Change account status to Activated
                    // Mongoose Method to save user into the database
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
                        html: 'Hello <strong>' + user.name + '</strong>,<br><br>' +
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
                        res.json({ success: true, message: 'Your username has been sent to ' + user.email })
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
                // Save token to user in database
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
                jwt.verify(token, secret, function(err, decoded) {
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
              if (req.body.password === null || req.body.password === '') {
                  res.json({ success: false, message: 'Password not provided' });
              } else {
                  user.password = req.body.password;                // Save user's new password to the user object
                  user.resettoken = false;                          // Clear user's resettoken
                  // Save user's new data
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
    // Middleware for Routes that checks for token - Place all routes after this route that require the user to already be logged in
    router.use(function (req, res, next) {
      const token = req.headers['x-access-token']; // Get from REQUEST or URL or HEADERS

       if (token) {
            // verify a token symmetric
           jwt.verify(token, secret, function(err, decoded) {
                if (err) {
                   res.json({success: false, message: 'Token invalid'}); // This happens when session is expired
               } else {
                   req.decoded = decoded;                                  //decoded basically takes the token combines with the SECRET, verifies it nad once its good it sends back decoded and sends back username and email
                   next();         // Required to leave middleware
                }

            });
       } else {
           res.json({ success: false, message: 'No token provided'});
       }
  });
    //ROUTE to GET currently logged in user
    router.post('/me', function (req, res) {
        res.send(req.decoded);
    });
    // Route to provide the user with a new token to renew session
//RENEW TOKEN.. after the middleware coz user must be logged in
    router.get('renewToken/:username', function (req, res) {
        User.findOne({ username: req.body.username }).select().exec(function (err, user) {
            if (err) throw err;
            if (!user) {
                res.json({ success: false, message: 'No user was found' });
            } else {
                const newToken =  jwt.sign({ username: user.username, email: user.email }, secret, {expiresIn: '24h'});  //(FRONTEND) we need to save this token in browser storage by implementing it in frontend auth -SERVICES
                res.json({ success: true, token: newToken});
            }
        });
    });

    // PERMISSIONS
    // Route to get the current user's permission level
    router.get('/permission', function (req, res) {
        User.findOne({ username: req.decoded.username }, function (err, user) {
            if (err) throw err;
            if (!user) {
                res.json({ success: false, message: 'No user was found' });
            } else {
                res.json({ success: true, permission: user.permission }); // Return the user's permission
            }
        });
    });

    // MANAGEMENT
    router.get('/management', function (req, res) {
        User.find({}, function (err, users) {
            if (err) throw err;
            User.findOne({ username: req.decoded.username }, function (err, mainUser) {
                if (err) throw err;
                if (!mainUser) {
                    res.json({ success: false, message: 'No user found.' });
                } else {
                    // Check if user has editing/deleting privileges
                    if (mainUser.permission === 'admin' || mainUser.permission === 'moderator') {
                        if (!users) {
                            res.json({ success: false, message: 'User not found' });
                        } else {
                            res.json({ success: true, users: users, permission: mainUser.permission });
                        }

                    } else {
                        res.json({ success: false, message: 'Insufficient Permissions' });
                    }
                }
            });
        });
    });
    // DELETE USERS (admin only)
    router.delete('/management/:username', function (req, res) {
        const deletedUser = req.params.username;                    // Assign the username from request parameters to a variable
        if (!mainUser) {
            res.json({success: false, message: 'No user found.'});
        } else {
            if (mainUser.permission !== 'admin') {
                res.json({ success: false, message: 'Insufficient Permissions' });
            } else {
                User.findOneAndRemove({ username: deletedUser }, function (err) {
                        if (err) throw err;
                        res.json({ success: true, message: 'User Deleted !'});
                });
            }
        }
    });

    // Edit User
    router.get('/edit/:id', function (req, res) {
        const editUser = req.params.id;
        User.findOne({ username: req.decoded.username }, function (err, mainUser) {
            if (err) throw err;
            if (!mainUser) {
                res.json({success: false, message: 'No user found.'});
            } else {
                if (mainUser.permission === 'admin' || mainUser.permission === 'moderator') {
                    User.findOne({ _id: editUser }, function (err, user) {
                        if (err) throw err;
                        if (!user) {
                            res.json({ success: false, message: 'No user found' });
                        } else {
                            res.json({ success: true, user: user });
                        }
                    });
                } else {
                    res.json({ success: false, message: 'Insufficient Permissions' });
                }
            }
        });
    });
    router.put('/edit', function (req, res) {
        editUser = req.body._id;
        if (req.body.name)  newName = req.body.name;
        if (req.body.username)  newUsername = req.body.username;
        if (req.body.email)  newEmail = req.body.email;
        if (req.body.permission)  newPermission = req.body.permission;
        // Look for logged in user in database to check if have appropriate access
        User.findOne({username: req.decoded.username}, function (err, mainUser) {
            if (err) throw err;
            if (!mainUser) {
                res.json({success: false, message: 'No user found.'});
            } else {
                if (newName) {
                    if (mainUser.permission === 'admin' || mainUser.permission === 'moderator') {
                        User.findOne({ _id: editUser }, function (err, user) {
                            if (err) throw err;
                            if (!user) {
                                res.json({ success: false, message: 'No user found' });
                            } else {
                                user.name = newName;
                                user.save(function (err) {
                                    if (err) {
                                        console.log(err);
                                    } else {
                                        res.json({ success: true, message: 'Name has been changed' });
                                    }
                                });
                            }
                        });
                    } else {
                        res.json({ success: false, message: 'Insufficient Permissions' });
                     }
                }
                if (newUsename) {
                    if (mainUser.permission === 'admin' || mainUser.permission === 'moderator') {
                        User.findOne({ _id: editUser }, function (err, user) {
                            if (err) throw err;
                            if (!user) {
                                res.json({ success: false, message: 'No user found' });
                            } else {
                                user.username = newUsername;
                                user.save(function (err) {
                                    if (err) {
                                        console.log(err);
                                    } else {
                                        res.json({ success: true, message: 'Username has been updated' });
                                    }
                                });
                            }
                        });
                    } else {
                        res.json({ success: false, message: 'Insufficient Permissions' });
                    }
                }
                if (newEmail) {
                    if (mainUser.permission === 'admin' || mainUser.permission === 'moderator') {
                        User.findOne({ _id: editUser }, function (err, user) {
                            if (err) throw err;
                            if (!user) {
                                res.json({ success: false, message: 'No user found' });
                            } else {
                                user.email = newEmail;
                                user.save(function (err) {
                                    if (err) {
                                        console.log(err);
                                    } else {
                                        res.json({ success: true, message: 'E-mail has been updated' });
                                    }
                                });
                            }
                        });
                    } else {
                        res.json({ success: false, message: 'Insufficient Permissions' });
                    }
                }
                if (newPermission) {
                    if (mainUser.permission === 'admin' || mainUser.permission === 'moderator') {
                        User.findOne({ _id: editUser }, function (err, user) {
                            if (err) throw err;
                            if (!user) {
                                res.json({ success: false, message: 'No user found' });
                            } else {
                              if (newPermission === 'user') {
                                  if (user.permission === 'admin') {
                                      if (mainUser.permission !== 'admin') {
                                          res.json({ success: false, message: 'Insufficient Permissions. You must be an admin to downgrade another admin' });
                                      } else {
                                          user.permission = newPermission;
                                          user.save(function (err) {
                                              if (err) {
                                                  console.log(err);
                                              } else {
                                                  res.json({ success: true, message: 'Permissions have been updated' });
                                              }
                                          });
                                      }
                                  } else {
                                      user.permission = newPermission;
                                      user.save(function (err) {
                                          if (err) {
                                              console.log(err);
                                          } else {
                                              res.json({ success: true, message: 'Permissions have been updated' });
                                          }
                                      });
                                  }
                              }
                              if (newPermission === 'moderator') {
                                  if (user.permission === 'admin') {
                                      if (mainUser.permission !== 'admin') {
                                          res.json({ success: false, message: 'Insufficient Permissions. You must be an admin to downgrade another admin' });
                                      } else {
                                          user.permission = newPermission;
                                          user.save(function (err) {
                                              if (err) {
                                                  console.log(err);
                                              } else {
                                                  res.json({ success: true, message: 'Permissions have been updated' });
                                              }
                                          });
                                      }
                                  } else {
                                      user.permission = newPermission;
                                      user.save(function (err) {
                                          if (err) {
                                              console.log(err);
                                          } else {
                                              res.json({ success: true, message: 'Permissions have been updated' });
                                          }
                                      });
                                  }
                              }
                              if (newPermission === 'admin') {
                                  if (mainUser.permission === 'admin') {
                                      user.permission = newPermission;
                                      user.save(function (err) {
                                          if (err) {
                                              console.log(err);
                                          } else {
                                              res.json({ success: true, message: 'Permissions have been updated' });
                                          }
                                      });
                                  } else {
                                      res.json({ success: false, message: 'Insufficient Permissions. You must be an admin to upgrade someone to admin level' });
                                  }
                              }
                            }
                        });
                    } else {
                        res.json({ success: false, message: 'Insufficient Permissions.' });
                    }
                }
            }
        });
    });



    return router;
}; // Module exports router

