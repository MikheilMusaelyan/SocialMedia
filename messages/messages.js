const Messages = require('./messages.mongoose')
const Message = require('./message.mongoose')
const express = require('express');
const router = express.Router();
const checkAuth = require('../auth/auth-validator');
const exportsFile = require('../exports');
const upload = exportsFile.upload;

router.post('', checkAuth, upload.single('images'), (req, res) => {
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
        const MSG = new Message({
            message: req.body.message,
            images: cloudinaryUrl,
            date: new Date(),
            sender: req.userData.userId 
        })
        Messages.findOneAndUpdate(
            { users: { $all: [req.userData.userId, req.body.ID] } },
            { $push: 
                {
                    messages: {
                        $each: [MSG],
                        $position: 0
                    }
                }
            },
            {new: true}
        )
        .then(data => {
            const lastId = data.messages[0]._id
            res.status(201).json({            
                lastId: lastId,
                images: data.messages[0].images
            })
        })
        .catch(error => {
            res.status(500).json({
                error
            })
        })
    }
})

router.get('', checkAuth, (req, res) => {
    const theirId = req.query.recieverId; 
    const myId = req.userData.userId;
    const msgAmount = req.query.amount;
    Messages.aggregate([ 
        { $match: { users: { $all: [myId, theirId] } } },
        {
            $project: {
                users: 1,
                messages: {$slice: ['$messages', +msgAmount, 20]}
            }
        }
    ])
    .then(msgs => {
        const msgArr = msgs[0].messages.reverse();
        res.status(200).json({
            msgArr
        })
    })
    .catch(err => {
        console.log(err)
        res.status(500).json({
            err
        })
    })
})


module.exports = router