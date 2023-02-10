const mongoose = require('mongoose')

const notifSchema = mongoose.Schema({
    text: {type: String, required: true},
    linker: {type: String, required: true},
    type: {type: String, required: true},
    date: {type: String, required: true, default: Date.now()}
})

module.exports = mongoose.model('Notification', notifSchema)