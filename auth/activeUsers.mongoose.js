const mongoose = require('mongoose')

const activeUserSchema = mongoose.Schema({
    socketId: {type: String, required: true},
    userId: {type: String, required: true}
})

// module.exports = mongoose.model('activeUsers', activeUserSchema)