const Messages = require('./messages.mongoose')
const Message = require('./message.mongoose')
const express = require('express');
const router = express.Router();
const checkAuth = require('../auth/auth-validator');
const exportsFile = require('../exports');
const upload = exportsFile.upload;

router.post('', checkAuth, upload.single('images'), (req, res) => {
    let imagePath = '';
    if(req.file && typeof(req.file) === 'object'){
        const url = req.protocol + "://" + req.get('host');
        imagePath = url + '/images/' + req.file.filename;
    };

    const MSG = new Message({
        message: req.body.message,
        images: imagePath,
        date: new Date(),
        sender: req.userData.userId 
    })
    Messages.findOneAndUpdate(
        { users: { $all: [req.userData.email, req.body.email] } },
        {$push: 
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
})

router.get('', checkAuth, (req, res) => {
    const theirEmail = req.query.recieverEmail;
    const myEmail = req.userData.email;
    const msgAmount = req.query.amount;
    Messages.aggregate([
        { $match: { users: { $all: [myEmail, theirEmail] } } },
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