const express = require('express');
const router = express.Router();
const Post = require('./singlepost-mongoose');
const User = require('../auth/auth-mongoose')
const Comment = require('../comments/comments-mongoose');
const Replier = require('../comments/replier.mongoose');
const Notification = require('../notification/notification-mongoose')

const checkAuth = require('../auth/auth-validator');
const exportsFile = require('../exports');
var ObjectId = require('mongodb').ObjectId;
const upload = exportsFile.upload;
const dotenv = require('dotenv');
dotenv.config();

function catchErr(res, err, msg) {
    console.log(err) 
    res.status(501).json({
        message: msg
    })
}

router.post('', checkAuth, upload.single('image'), (req, res, next) => {
    let cloudinaryUrl = ""
    if(req.file && typeof(req.file) === "object"){
        exportsFile.uploadOnCloud(req.file).then(data => {
            cloudinaryUrl = data.secure_url;
            mainFunction()
        })
    } else {
        mainFunction()
    }

    function mainFunction(){
        let usersId = req.userData.userId;

        User.findOne({_id: usersId})
        .then(usersData => {
            if(usersData.afterLogin.profilePic.length <= 1){
                usersData.afterLogin.profilePic = ""
            }
            let addedPost = new Post({
                post: req.body.post,
                image: cloudinaryUrl,
                comments: JSON.parse(req.body.comments),
                likes: +req.body.likes,
                creatorId: usersId,
                date: Date.now(),
                creatorProfilePic: usersData.afterLogin.profilePic,
                creatorNickname: usersData.nickname,
                commentsLength: 0
            });

            addedPost.save().then(data => {
                res.status(201).json({
                    data: data
                })
            })
            .catch(err => {
                console.log(err)
                res.status(500).json({
                    err
                })
            })
        })
    }
});


router.put("/edit", checkAuth, upload.single('updatedImage'), (req, res, next) => {
    let cloudinaryUrl = req.body.updatedImage;
    if(req.file && typeof(req.file) === "object"){
        exportsFile.uploadOnCloud(req.file).then(data => {
            cloudinaryUrl = data.secure_url;
            mainFunction()
        })
    } else {
        mainFunction()
    };

    function mainFunction() {
        Post.findOne({creatorId: req.userData.userId, _id: req.body.postID})
        .then(data => {
            data.image = cloudinaryUrl;
            data.post = req.body.updatedPost
            data.save()
            .then(resData => {
                res.status(200).json({
                    resData
                })
            }) 
            .catch(() => {
                res.status(500).json({
                    message: 'Couldn\'t save the post'
                })
            }) 
        })
        .catch(() => {
            res.status(500).json({
                message: 'Couldn\'t update the post'
            })
        })
    }
})  


router.delete('/delete/:id', checkAuth, (req, res, next) => {
    Post.deleteOne({_id: req.params.id, creatorId: req.userData.userId})
    .then(response => {
        res.status(200).json({
            response
        })
    })
    .catch(err => {
        res.status(404).json({
            err
        })
    })
})

router.get('/singlePost', (req, res) => {
    const amount = +req.query.amount;
    const increasingAmount = +req.query.increasingAmount
    Post.aggregate([
    {
        $match: {_id: new ObjectId(req.query.postId)}
    },
    {
        $project: {
            '_id' : 1,
            paginatedComments: {
                $slice: ['$comments', amount, increasingAmount]
            },
        }
    },
    ])
    .then(data => {
        const postCommentsC = data[0].paginatedComments;
        res.status(200).json({
            postCommentsC
        })
    })
    .catch(err => {
        console.log(err)
        res.status(500).json({
            err
        })
    })
})

router.get('/allPosts/:incAmount', (req, res, next) => {
    const increasingAmount = +req.params.incAmount;
    Post.count().then(postCount => {
        let fetchAmount = 20;
        let toSkip = postCount - increasingAmount;   

        if(toSkip < 0){
            if(toSkip + fetchAmount > 0){
                fetchAmount = toSkip + fetchAmount;
                toSkip = 0;

            } else if(toSkip + fetchAmount <= 0){
                res.status(200).json({
                    posts: []
                })
                return
            }
        }


        Post.aggregate([
            { $skip: toSkip },
            { $limit: fetchAmount },
            { $project: { comments: 0 } }
        ])
        .then(POSTS => {
            const posts = POSTS.reverse();
            res.status(200).json({
                posts: posts
            });
        })
        .catch(err => {
            console.log(err)
            res.status(501).json({
                err
            })
        });
    });
});


router.post('/comment/:postId', checkAuth, upload.single('image'), (req, res, next) => {
    let cloudinaryUrl = "";
    if(req.file && typeof(req.file) === "object"){
        exportsFile.uploadOnCloud(req.file).then(data => {
            cloudinaryUrl = data.secure_url;
            mainFunction()
        })
    } else {
        mainFunction()
    };

    function mainFunction(){
        User.findOne({_id: req.userData.userId})
        .then(user => {
            let userNickname = user.nickname;
            let userProfilePic = user.afterLogin.profilePic;
            if(userProfilePic == undefined || userProfilePic == null){
                userProfilePic = ""
            }
            Post.findOne({_id: req.params.postId})
            .then(post => {
                const commentAdded = new Comment({
                    comment: req.body.comment,
                    image: cloudinaryUrl,
                    replies: [],
                    creatorId: req.userData.userId,
                    creatorProfilePic: userProfilePic,
                    creatorNickname: userNickname,
                    date: Date.now()
                });
                post.updateOne(
                    {
                        $push: {
                            comments: {
                                $each: [commentAdded], 
                                $position: 0
                            }
                        },
                        $inc: {'commentsLength': 1}
                    }
                )
                .then(POST => {
                    const ME = new Notification({
                        text: `${user['nickname']} commented on your post`,
                        linker: req.params.postId,
                        type: 'post',
                        date: new Date()
                    });
                    
                    if(String(post.creatorId) !== req.userData.userId){
                        User.updateOne(
                            {_id: post.creatorId},
                            {
                                $push: {
                                    'notifications': {
                                        $each: [ME],
                                        $position: 0
                                    }
                                },
                            }
                        )
                        .then(() => {
                            res.status(201).json({
                                postCommentsC: commentAdded
                            })
                        })
                        .catch(err => 
                            res.status(500).json({
                                err
                            })
                        )
                    };
                })
                .catch(err => {
                    res.status(501).json({
                        err
                    })
                })
            })
            .catch(err => {
                res.status(501).json({
                    err
                })
            })
        })
    }
});

router.post('/reply', checkAuth, upload.single('image'),
(req, res, next) => {
    let cloudinaryUrl = "";
    if(req.file && typeof(req.file) === "object"){
        exportsFile.uploadOnCloud(req.file).then(data => {
            cloudinaryUrl = data.secure_url;
            mainFunction()
        })
    } else {
        mainFunction()
    };

    function mainFunction(){
        User.findOne(
            {
                _id: req.userData.userId,
            },
        )
        .then(user => {
            // userfind
            let userNickname = user.nickname;
            let userProfilePic = user.afterLogin.profilePic;
            if(userProfilePic == undefined || userProfilePic == null){
                userProfilePic = ""
            } if(req.body.image == undefined || req.body.image == null){
                req.body.image = ""
            }
            const replier = new Replier({
                comment: req.body.comment,
                image: cloudinaryUrl,
                replies: [],
                creatorId: req.userData.userId,
                postId: req.query.postId,
                creatorPic: userProfilePic,
                creatorNickname: userNickname,
                date: Date.now()
            });
            const ME = new Notification({
                text: `${user['nickname']} replied to you`,
                linker: req.query.postId,
                type: 'post',
                date: new Date()
            })

            Post.findOneAndUpdate(
                { _id: req.query.postId, "comments._id": new ObjectId(req.query.commentId)},
                { 
                    $push: {"comments.$.replies": replier},
                    $inc: {'commentsLength': 1}
                },
                { returnOriginal: false },
            )
            .then(() => {
                if(req.body.creatorNickname !== user.nickname){
                    User.updateOne(
                        {nickname: req.body.creatorNickname},
                        {
                            $push: {
                                'notifications': {
                                    $each: [ME],
                                    $position: 0
                                }
                            },
                        }
                    )
                    .then(() => {
                        res.status(201).json({
                            postCommentsC: replier
                        })
                    })
                    .catch(err => {
                        res.status(500).json({
                            error: err
                        })
                    })
                }
            })
            .catch(err => {
                res.status(500).json({
                    err
                })
            })
        })
    }
});



// important!!!
// router.put('/anotherReply', (req, res) => {
//     let replier = {

//     }
//     Post.findOneAndUpdate(
//         {
//             _id: new ObjectId(req.query.id),
//         },
//         {
//             $push: {
//                 "comments.$[cId].replies.$[rId].replies": {
//                     replier
//                 }
//             }
//         },
//         {
//             arrayFilters: [
//                 {'cId._id': new ObjectId(req.query.commentId)},
//                 {'rId._id': new ObjectId(req.query.replyId)},
//             ]
//         }
//     )
//     .then(data => {
//         res.status(200).json({
//             data: data
//         })
//     })
//     .catch(err => {
//         console.log(err)
//         res.status(500).json({
//             err
//         })
//     })
// })

router.put('/replyEdit', checkAuth, upload.single('updatedImage'), (req, res) => {
    let cloudinaryUrl = req.body.updatedImage;
    if(req.file && typeof(req.file) === "object"){
        exportsFile.uploadOnCloud(req.file).then(data => {
            cloudinaryUrl = data.secure_url;
            mainFunction()
        })
    } else {
        mainFunction()
    };
    
function mainFunction(){
    Post.findOneAndUpdate(
        {
            _id: new ObjectId(req.body.postID),
        },
        {
            $set: {
                'comments.$[cId].replies.$[rId].comment': req.body.updatedPost,
                'comments.$[cId].replies.$[rId].image': cloudinaryUrl,
            }
        },
        {
            arrayFilters: [
                {'cId._id': new ObjectId(req.query.commentId)},
                {'rId._id': new ObjectId(req.query.replyId)},
            ]
        }
    )
    .then(data => {
        res.status(201).json({
            message: 'reply edited'
        })
    })
    .catch(err => {
        res.status(501).json({
            err
        })
    })
}
})


router.put('/commentEdit', checkAuth, upload.single('updatedImage'), (req, res) => {
    let cloudinaryUrl = req.body.updatedImage;
    if(req.file && typeof(req.file) === "object"){
        exportsFile.uploadOnCloud(req.file).then(data => {
            cloudinaryUrl = data.secure_url;
            mainFunction()
        })
    } else {
        mainFunction()
    };
function mainFunction(){
    Post.findOneAndUpdate(
        {
            _id: new ObjectId(req.body.postID),
            // '$comments.$[cId].creatorId': req.userData.userId
        },
        {
            $set: {
                'comments.$[cId].comment': req.body.updatedPost,
                'comments.$[cId].image': cloudinaryUrl,
            }
        },
        {
            arrayFilters: [
                {'cId._id': new ObjectId(req.query.commentId)},
            ]
        }
    )
    .then(data => {
        res.status(201).json({
            message: 'comment edited'
        })
    })
    .catch(err => {
        res.status(501).json({
            err
        })
    })
}
})

router.put('/delete-comment', checkAuth, (req, res) => {
    Post.findOneAndUpdate(
        {
            _id: req.body.postId
        },
        {
            $pull: {"comments": {"_id": new ObjectId(req.body.commentId)}},
            $inc: { 'commentsLength': -1 }
        },
    )
    .then(post => {
        res.status(201).json({
            post
        });
    })
    .catch(err => {
        return res.status(400).json({
            message: err
        })
    })
})

router.put('/delete-reply', checkAuth, (req, res) => {
    Post.findOneAndUpdate(
        {_id: req.body.postId},
        { 
            $inc: {
                'commentsLength': -1
            },
            $pull: {
                "comments.$[cId].replies": {
                    "_id": new ObjectId(req.body.replyId)
                }
            }
        },
        { arrayFilters: [
            {"cId._id": new ObjectId(req.body.commentId)},
        ]}
    )
    .then(post => {
        let comments = post.comments;
        res.status(201).json({
            comments
        });
    })
    .catch(err => {
        res.status(400).json({
            message: err
        })
    })
})




// router.post('/likePost', checkAuth, (req, res, next) => {
//     const ID = req.body.postId;
//     const postCreator = req.body.creatorId;
//     Post.findOneAndUpdate(
//         {_id: new ObjectId(ID)},
//         {$inc: {"likes": 1}}
//     )
//     .then(d => {
//         User.findOneAndUpdate(
//             {_id: new ObjectId(req.userData.userId)},
//             {$push: {'afterLogin.liked': ID}},
//             // only this worked - afterlogin.$.liked-object, array-al.liked
//         )
//         .then(user => {
//             console.log(d, "-", user)
//         })
//     })
//     User.findById
// })

module.exports = router
