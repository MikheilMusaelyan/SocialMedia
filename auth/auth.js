const express = require('express');
const router = express.Router();
const User = require('../auth/auth-mongoose');
const Post = require('.././posts/post-mongoose')
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const checkAuth = require('./auth-validator');
const exportsFile = require('../exports');
const Messages = require('../messages/messages.mongoose');


const upload = exportsFile.upload;

var ObjectId = require('mongodb').ObjectId;

router.post('', (req, res, cb) => {
    bcrypt.hash(req.body.password, 10)
    .then(hash => {
        new User({
            email: req.body.email,
            nickname: req.body.nickname,
            password: hash,
            socketId: '',
            afterLogin: req.body.afterLogin
        })
        .save().then((user) => {
            res.status(200).json({
                user
            })
        })
        .catch(err => {
            console.log(err)
            res.status(500).json({
                message: err
            });
        })
    })
});

router.get('/', (req, res, cb) => {
    // let myId = req.userData.userId;
    User.find()
    .then(data => {
        res.status(200).json({
            data
        })
    })
    .catch(err => {
        res.status(500).json({
            message: 'Couldn\'t reach the DB'
        });
    })
});


router.post('/login', (req, res, cb) => {
    let foundUser;
    
    User.findOne({nickname: req.body.nickname})
    .then(user => {
        console.log(user)
        if(user == false || user == undefined || user == null){
            // res.status(400).json({
            //     message: 'User not found'
            // });
            return
        };
        foundUser = user;
        return bcrypt.compare(req.body.password, user.password)
    })
    .then(bool => {
        if(bool == false || bool == undefined || bool == null){
            res.status(400).json({
                message: 'User not found'
            });
            return
        }

        foundUser.updateOne(
            {
                $set: {
                    'socketId': req.body.socketId,
                    'afterLogin.connected': true
                }
            },
            {new: true}
        )
        .then()
        .catch(err => {
            res.status(500).json({
                message: 'User not found'
            });
            console.log(err)
        });

        
        let updatedUsers = [];
        let friendsQuery = foundUser.afterLogin.friends.slice();
        User.aggregate([
            {
                $match: {
                    '_id': {
                        $in: friendsQuery.map(id => new ObjectId(id))
                    }
                }
            },
            {
                $group: { 
                    _id: "$_id", 
                    socketId: {'$first': '$socketId'}
                }
            }
        ])
        .then(users => {
            for (let user of users) {
                updatedUsers.push(user.socketId);
            };
            const token = jwt.sign(
                {email: foundUser.email, userId: foundUser._id},
                process.env.JWT_SECRET_KEY,
                {expiresIn: '3h'}
            );
            res.status(200).json({
                token: token,
                userId: foundUser._id,
                friendsSockets: updatedUsers
            })
        })
        .catch(err => {
            res.status(400).json({
                err
            })
        })
    })
    .catch(err => {
        res.status(500).json({
            message: 'User not found'
        });
    })
});

// renew socketID automatically
// router.put('/renewSocketId', checkAuth, (req, res) => {
//     User.findOneAndUpdate(
//         {_id: req.userData.userId},
//         {$set: {socketId: req.body.socketId}},
//         {new: true}
//     )
//     .then()
//     .catch(err => {
//         res.status(500).json({
//             err
//         })
//     })
// })


router.get('/singleUser', (req, res, cb) => {
    User.aggregate([
        {
            $match: {
                _id: new ObjectId(req.query.id)
            }
        },
        {
            $group: {
                _id : "$_id",
                afterLogin: {'$first' : '$afterLogin'},
                nickname: {"$first": '$nickname'},
            }
        }
    ])
    .then(user => {
        let returnUser = user[0];

        if(req.query.bool === 'true'){
            Post.aggregate([
            {
                $match: {
                    'creatorId': req.query.id
                }
            },
            {
                $project: {
                    comments: 0
                }
            }
            ])
            .then(posts => {
                res.status(200).json({
                    returnUser,
                    posts
                })
            })
            return
        } else if(req.query.bool === 'false'){
            res.status(200).json({
                returnUser
            })
        }
    })
    .catch(err => {
        console.log(err)
        res.status(501).json({
            message: 'User not found'
        });
    })
})

// User.updateMany(
//     {$set: {'$afterLogin.coverPic': ''}}
// ).then(data => {
//     console.log(data)
// })

router.get('/mySelf', checkAuth, (req, res) => {
    console.log('fdsahgi')
    User.aggregate([
        {
            $match: {
                "_id": new ObjectId(req.userData.userId)
            }
        },
        {
            $group:{
                _id: '$_id',
                profilePic: {'$first': '$afterLogin.profilePic'}
            }
        }
    ])
    .then(user => {
        res.status(201).json({
            user
        })
    })
    .catch(err => {
        res.status(500).json({
            err
        })
    })
})

// User.updateMany({$set: {'afterLogin.gotReqs': []}}).then(data=>console.log(data))

router.put('/addFriend', checkAuth, (req, res) => {
    let haveSent = false;
    let haveRecieved = false;
    let areFriends = false;
    if(req.userData.userId === req.body.userId){
        return
    }
    User.findOne({_id: req.userData.userId})
    .then(me => {
        for(let i of me.afterLogin.friends){
            if(i === req.body.userId){
                removeFriend();
                areFriends = true;
                console.log('this happens if you are friends' )
                return
            }
        }
        if(!areFriends){
            console.log('this happens if you are not friends' )
            for(let i of me.afterLogin.gotReqs){
                if(i === req.body.userId){
                    if(req.body.deleteTheirReq){
                        cancelTheirRequest()
                        console.log('canceltheirs')
                    } else {
                        console.log('conffirm')
                        confirm();
                    }
                    haveRecieved = true;
                    console.log('this happens if you have recieved a request' )
                    return
                }
            }
        }
        if(!haveRecieved){
            console.log('this happens if you haven\'t recieved a request' )
            for(let i of me.afterLogin.sentReqs){
                if(i === req.body.userId){
                    cancelYourRequest()
                    console.log('this happens if we have already sent')
                    haveSent = true;
                    return
                }
            }
            if(!haveSent){
                console.log('this happens if both are false and we have to send')
                send()
                return
            }
        }
        
        // action |
        //        V
        function cancelTheirRequest(){
            User.findOneAndUpdate(
                {_id: req.userData.userId},
                {$pull: {'afterLogin.gotReqs': req.body.userId}}
            )
            .then(user => {
            })
            .catch(err => {
                res.status(501).json({
                    message: 'User not found1'
                });
            })

            // otheruer
            User.findOneAndUpdate(
                {_id: req.body.userId},
                {$pull: {'afterLogin.sentReqs': req.userData.userId}}
            )
            .then(user => {
                res.status(201).json({
                    message: 'success'
                })
            })
            .catch(err => {
                res.status(501).json({
                    message: 'User not found1'
                });
            })
        }
        function cancelYourRequest(){
            User.findOneAndUpdate(
                {_id: req.userData.userId},
                {$pull: {'afterLogin.sentReqs': req.body.userId}}
            )
            .then(user => {
            })
            .catch(err => {
                res.status(501).json({
                    message: 'User not found1'
                });
            })

            // otheruer
            User.findOneAndUpdate(
                {_id: req.body.userId},
                {$pull: {'afterLogin.gotReqs': req.userData.userId}}
            )
            .then(user => {
                res.status(201).json({
                    message: 'success'
                })
            })
            .catch(err => {
                res.status(501).json({
                    message: 'User not found1'
                });
            })
        }
        function removeFriend(){
            let myEmail;
            User.findOneAndUpdate(
                {_id: req.userData.userId},
                {$pull: {'afterLogin.friends': req.body.userId}}
            )
            .then(user => {
                myEmail = user.email;
                User.findOneAndUpdate(
                    {_id: req.body.userId},
                    {$pull: {'afterLogin.friends': req.userData.userId}}
                )
                .then(user => {
                    Messages.findOneAndDelete(
                        {'users': {$all: [myEmail, user.email]}}
                    )
                    .then(data => {
                        res.status(201).json({
                            message: 'success'
                        })
                    })
                })
                .catch(err => {
                    res.status(501).json({
                        message: 'User not found1'
                    });
                })
            })
            .catch(err => {
                res.status(501).json({
                    message: 'User not found1'
                });
            })
        }
        function confirm(){
            let usersArr = [];
            User.findOneAndUpdate(
                {_id: req.userData.userId},
                {
                    $pull: {'afterLogin.gotReqs': req.body.userId},
                    $push: {'afterLogin.friends': req.body.userId}
                }
            )
            .then(me => {
                usersArr.push(me.email)
                // second started
                User.findOneAndUpdate(
                    {_id: req.body.userId},
                    {
                        $pull: {'afterLogin.sentReqs': req.userData.userId},
                        $push: {'afterLogin.friends': req.userData.userId}
                    }
                )
                .then(otherUser => {
                    usersArr.push(otherUser.email);
                    new Messages({
                        users: usersArr,
                        messages: [],
                    })
                    .save().then(data => {
                        res.status(201).json({
                            message: 'success'
                        })
                    })
                    .catch(err => {
                        res.status(501).json({
                            message: 'Couldn\'t create conversation'
                        });
                    })
                })
                .catch(err => {
                    res.status(501).json({
                        message: 'User not found1'
                    });
                })
                // second ended
                })
            .catch(err => {
                res.status(501).json({
                    message: 'User not found1'
                });
            })
        }
        function send(){
            User.findOneAndUpdate(
                {_id: req.body.userId},
                {$addToSet: {'afterLogin.gotReqs': req.userData.userId}}
            )
            .then(user => {
            })
            .catch(err => {
                    res.status(501).json({
                        message: 'User not found'
                    });
            })

            User.findOneAndUpdate(
                {_id: req.userData.userId}, 
                {$addToSet: {"afterLogin.sentReqs": req.body.userId}}
            )
            .then(user => {
                res.status(201).json({
                    message: 'success'
                })
            })
            .catch(err => {
                    res.status(501).json({
                        message: 'User not found1'
                    });
            })
        }
    })
});

router.get('/getMyFriends', checkAuth, (req, res) => {
    User.findOne({_id: req.userData.userId}).then(me => {
        let friendsQuery = me.afterLogin.friends.slice();
        User.aggregate([
            {
                $match: {
                    '_id': {
                        $in: friendsQuery.map(id => new ObjectId(id))
                    }
                }
            },
            {
                $group: { 
                    _id: "$_id", 
                    nickname:  {"$first": "$nickname"},
                    profilePic: {'$first': '$afterLogin.profilePic'},
                    email: {'$first': '$email'},
                    socketId: {'$first': '$socketId'},
                    connected: {'$first': '$afterLogin.connected'}
                }
            }
        ])
        .then(users => {
            res.status(200).json({
                users
            })
        })
        .catch(err => {
        res.status(500).json({
            err
        })
        })
    })
});

// router.get('/emitFriends', checkAuth, (req,res) => {
//     User.findOne({_id: req.userData.userId}).then(me => {
//         let friendsQuery = me.afterLogin.friends.slice();
//         User.aggregate([
//             {
//                 $match: {
//                     '_id': {
//                         $in: friendsQuery.map(id => new ObjectId(id))
//                     }
//                 }
//             },
//             {
//                 $group: { 
//                     _id: "$_id", 
//                 }
//             }
//         ])
//         .then(users => {
//             console.log(users, 'usersIds')
//             res.status(200).json({
//                 users
//             })
//         })
//         .catch(err => {
//             res.status(400).json({
//                 err
//             })
//         })
//     })
// })

router.put('/profilePic', checkAuth, upload.single('profilePic'), (req, res) => {
    let profilePicture = '';
    if(req.file){
        const url = req.protocol + "://" + req.get('host');
        profilePicture = url + '/images/' + req.file.filename;
    }
    User.findOneAndUpdate(
        {_id: req.userData.userId},
        {
            $set: {
                'afterLogin.profilePic': profilePicture,
            }
        }
    )
    .then(me => {
        Post.updateMany(
            {'creatorId': req.userData.userId},
            {
                $set: {
                    'creatorProfilePic': profilePicture 
                }
            }
        )
        .then(data => {
            res.status(201).json({
                me
            })
        })
        .catch(error => {
            res.status(500).json({
                error
            })
        })
    })
    .catch(error => {
        res.status(500).json({
            error
        })
    })
})

router.put('/coverPic', checkAuth, upload.single('coverPic'), (req, res) => {
    let coverPicture = '';
    if(req.file){
        const url = req.protocol + "://" + req.get('host');
        coverPicture = url + '/images/' + req.file.filename;
    }
    User.findOneAndUpdate(
        {_id: req.userData.userId},
        {$set: {'afterLogin.coverPic': coverPicture}}
    )
    .then(me => {
        res.status(201).json({
            me
        })
    })
    .catch(error => {
        res.status(500).json({
            error
        })
    })
})

router.put('/disconnect', checkAuth, (req, res) => {
    User.findOneAndUpdate(
        {_id: new ObjectId(req.userData.userId)},
        {
            $set: {
                'afterLogin.connected': false
            }
        },
        {
            new: true
        }
    )
    .then(data => {
        console.log(data, 'appply')
        res.status(201).json({
            message: 'disconnected'
        })
    })
    .catch(err => {
        res.status(400).json({
            err
        })
    })
})

module.exports = router;