const express = require('express');
const router = express.Router();
const Post = require('./singlepost-mongoose');
const User = require('../auth/auth-mongoose')
const checkAuth = require('../auth/auth-validator');
const Comment = require('../comments/comments-mongoose');
const Replier = require('../comments/replier.mongoose');
const exportsFile = require('../exports')
var ObjectId = require('mongodb').ObjectId;

const upload = exportsFile.upload;

router.post('', checkAuth, upload.single('image'), (req, res, next) => {
    let optUrl;
    if(req.file && typeof(req.file) === "object"){
        const url = req.protocol + "://" + req.get('host');
        optUrl = url + '/images/' + req.file.filename;
    } else {
        optUrl = ""
    }

    let usersId = req.userData.userId;

    User.findOne({_id: usersId})
    .then(usersData => {
        if(usersData.afterLogin.profilePic.length <= 1){
            usersData.afterLogin.profilePic = ""
        }
        let addedPost = new Post({
            post: req.body.post,
            image: optUrl,
            comments: JSON.parse(req.body.comments),
            likes: +req.body.likes,
            creatorId: usersId,
            date: Date.now(),
            creatorProfilePic: usersData.afterLogin.profilePic,
            creatorNickname: usersData.nickname,
            commentsLength: 0
        });
        
        addedPost.save().then(data => {
            usersData.updateOne({$push: {"afterLogin.posts": addedPost}}).then(d => {
                res.status(201).json({
                    data: data
                })
            })
        })
        .catch(err => {
            res.status(500).json({
                err
            })
        })
    })
});


router.put("/edit", checkAuth, upload.single('updatedImage'), (req, res, next) => {
    let imagePath = req.body.updatedImage;
    if(req.file){
        const url = req.protocol + "://" + req.get('host');
        imagePath = url + '/images/' + req.file.filename;
    };
    Post.findOne({creatorId: req.userData.userId, _id: req.body.postID})
    .then(data => {
        User.findOneAndUpdate(
            {
                _id: req.userData.userId, 
                "afterLogin.posts._id": new ObjectId(req.body.postID)
            },
            {$set: {
                "afterLogin.posts.$.post": req.body.updatedPost, 
                "afterLogin.posts.$.image": imagePath
                }
            }
        )
        .then(user => {
            console.log(user)
        })
        data.image = imagePath;
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
})


router.delete('/delete/:id', checkAuth, (req, res, next) => {
    Post.deleteOne({_id: req.params.id, creatorId: req.userData.userId})
    .then(response => {
        User.findOneAndUpdate(
            {_id: req.userData.userId},
            {$pull: {"afterLogin.posts": {"_id": new ObjectId(req.params.id)}}})
        .then(data => {
            res.status(200).json({
                response, data
            })
        })
        .catch(err => {
            res.status(404).json({
                err
            })
        })
    })
    .catch(err => {
        res.status(404).json({
            err
        })
    })
})

// router.get('/singlePost/:id', (req, res, next) => {
//     Post.findOne({_id: req.params.id})
//     .then(post => {
//         postCommentsC = post.comments
//         res.status(200).json({
//             postCommentsC
//         })
//     })
//     .catch(err => {
//         err
//     })
// })

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

router.get('/:postsToReturn', (req, res, next) => {
    Post.aggregate([
    {
        $project: {
            comments: 0
        }
    }
    ]).then(posts => {
        res.status(200).json({
            posts: posts
        })
    })
    .catch(err => {
        res.status(501).json({
            err
        })
    });
});


router.post('/comment/:postId', checkAuth, upload.single('image'), 
(req, res, next) => {
    User.findOne({_id: req.userData.userId})
    .then(user => {
        let userNickname = user.nickname;
        let userProfilePic = user.afterLogin.profilePic;
        if(userProfilePic == undefined || userProfilePic == null){
            userProfilePic = ""
        }
        Post.findOne({_id: req.params.postId})
        .then(post => {
            const url = req.protocol + "://" + req.get('host');
            let optUrl;
            if(req.file && typeof(req.file) === "object"){
                optUrl = url + '/images/' + req.file.filename
            } else {
                optUrl = ""
            }
            // image checked
            // we have to increase comments in USER's posts to just show amount
            // user.updateOne(
            //     {'afterLogin.posts._id': new ObjectId(req.params.postId)},
            //     {$inc: {'commentsLength' : 1}},
            // )
            // .then(d => {
            //     console.log(d, 'knows')
            // }).catch(err => {
            //     console.log(err, 'egeee', err, 'second')
            // })

            const commentAdded = new Comment({
                comment: req.body.comment,
                image: optUrl,
                replies: [],
                creatorId: req.userData.userId,
                creatorProfilePic: userProfilePic,
                creatorNickname: userNickname,
                date: Date.now()
            });
            post.updateOne(
                {
                    $push:{
                        comments: {
                            $each: [commentAdded], 
                            $position: 0
                        }
                    },
                    $inc: {'commentsLength': 1}
                }
            )
            .then(posts => {
                res.status(201).json({
                    postCommentsC: commentAdded
                })
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
});

router.post('/reply', checkAuth, upload.single('image'),
(req, res, next) => {
    User.findOneAndUpdate(
        {
            _id: req.userData.userId,
            'afterLogin.posts._id': new ObjectId(req.query.postId)
        },
        {$inc: {'$commentsLength' : 1}},
    ).then(user => {
        console.log('did well on adding reply', user)
        const url = req.protocol + "://" + req.get('host');
        let optUrl;
        if(req.file && typeof(req.file) === "object"){
            optUrl = url + '/images/' + req.file.filename
        } else {
            optUrl = ""
        }
        // userfind
        let userNickname = user.nickname;
        let userProfilePic = user.afterLogin.profilePic;
        if(userProfilePic == undefined || userProfilePic == null){
            userProfilePic = ""
        } if(req.body.image == undefined || req.body.image == null){
            req.body.image = ""
        }
        let replier = new Replier({
            comment: req.body.comment,
            image: optUrl,
            creatorId: req.userData.userId,
            postId: req.query.postId,
            creatorPic: userProfilePic,
            creatorNickname: userNickname,
            date: Date.now()
        });

        // user.updateOne(
            
        // )
        // .then()
        // .catch(err => {
        //     return res.status(400).json({
        //         message: err
        //     })
        // })

        Post.findOneAndUpdate(
            { _id: req.query.postId, "comments._id": new ObjectId(req.query.commentId)},
            { 
                $push: {"comments.$.replies": replier},
                $inc: {'commentsLength': 1}
            },
            { returnOriginal: false },
        )
        .then(() => {
            res.status(201).json({
                postCommentsC: replier
            })
        })
        .catch(err => {
            res.status(500).json({
                err
            })
        })
    })
});

router.put('/replyEdit', checkAuth, upload.single('updatedImage'), (req, res) => {
    let imagePath = req.body.updatedImage;
    if(req.file){
        const url = req.protocol + "://" + req.get('host');
        imagePath = url + '/images/' + req.file.filename;
    } 
    Post.findOneAndUpdate(
        {
            _id: new ObjectId(req.body.postID),
            // '$comments.$[cId].replies.$[rId].creatorId': req.userData.userId
        },
        {
            $set: {
                'comments.$[cId].replies.$[rId].comment': req.body.updatedPost,
                'comments.$[cId].replies.$[rId].image': imagePath,
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
})

router.put('/commentEdit', checkAuth, upload.single('updatedImage'), (req, res) => {
    let imagePath = req.body.updatedImage;
    if(req.file){
        const url = req.protocol + "://" + req.get('host');
        imagePath = url + '/images/' + req.file.filename;
    } 
    Post.findOneAndUpdate(
        {
            _id: new ObjectId(req.body.postID),
            // '$comments.$[cId].creatorId': req.userData.userId
        },
        {
            $set: {
                'comments.$[cId].comment': req.body.updatedPost,
                'comments.$[cId].image': imagePath,
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
})

router.put('/delete-comment', checkAuth, (req, res) => {
    Post.findOneAndUpdate(
        {
            _id: req.body.postId
        },
        {
            $pull: {"comments": {"_id": new ObjectId(req.body.commentId)}},
            $inc: {'commentsLength': -1}
        },
    )
    .then(post => {
        res.status(201).json({
            post
        });

        User.findOneAndUpdate(
            {_id: new ObjectId(post.creatorId), 'afterLogin.posts._id': new ObjectId(req.body.postId)},
            {$inc: {'$commentsLength' : -1}},
        )
        .then(d=>{
            console.log(d, 'dsaaaaaaa')
            console.log('did well on del comment')
        })
        .catch(err => {
            console.log('did bad on del comment', err)
            return res.status(400).json({
                message: err
            })
        })
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


        User.findOneAndUpdate(
            {_id: post.creatorId, 'afterLogin.posts._id': new ObjectId(req.body.postId)},
            {$inc: {'$commentsLength' : -1}},
        )
        .then(f => {
            console.log('gound it')
        })
        .catch(err => {
            console.log('err on deleting reply', err)
            return res.status(400).json({
                message: err
            })
        })
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
