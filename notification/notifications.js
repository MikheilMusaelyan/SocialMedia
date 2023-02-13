const express = require('express');
const router = express.Router();
const Users = require('../auth/auth-mongoose');
const checkAuth = require('../auth/auth-validator');
var ObjectId = require('mongodb').ObjectId;

router.get('/', checkAuth, (req, res) => {
    Users.aggregate([
        {
            $match: {
                _id: new ObjectId(req.query.id)
            }
        },
        {
            $project: {
                notifications: { $slice: ["$notifications", 20 * (req.query.fetchTimes - 1), 20] }
            }
        }
    ]).then(data => {
        const NOTIFICATIONS = data[0].notifications;
        res.status(200).json({
            NOTIFICATIONS
        })
    })
})

module.exports = router;

