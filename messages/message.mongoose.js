const mongoose = require('mongoose')
let messageSchema = new mongoose.Schema({
    message: {type: String, required: true},
    images: {type: String, required: true},
    date: {type: Date, default: new Date(), immutable: true, required: true},
    sender: {type: String, required: true}
})

module.exports = mongoose.model('Message', messageSchema) 