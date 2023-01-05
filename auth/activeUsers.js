const express = require('express')
const router = express.Router()
const ActiveUsers = require('./activeUsers.mongoose');

router.post('/', (req, res) => {
    const activeUser = new ActiveUsers({

    })
})

module.exports = router