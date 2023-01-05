const mongoose = require('mongoose');
// const uniqueValidator = require('mongoose-unique-validator')
const userSchema = mongoose.Schema({
    email: {type: String, required: true, unique: true},
    nickname: {type: String, required: true, unique: true},
    password: {type: String, required: true},
    socketId: {type: String},
    afterLogin: {type: Object, required: true},
});




// userSchema.plugin(uniqueValidator);

module.exports = mongoose.model('User', userSchema)