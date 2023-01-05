const mongoose = require('mongoose');

let messageGroupSchema = new mongoose.Schema({
    users: {type: Array, required: true},
    messages: {type: Array, required: true},
})

module.exports = mongoose.model('MessageGroup', messageGroupSchema)