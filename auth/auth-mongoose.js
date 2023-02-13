const mongoose = require('mongoose');
// const uniqueValidator = require('mongoose-unique-validator')
const userSchema = mongoose.Schema({
    email: {type: String, required: true, unique: true, maxLength: 30},
    nickname: {type: String, required: true, unique: true, maxLength: 12},
    password: {type: String, required: true},
    notifications: {type: Array, required: true},
    afterLogin: {type: Object, required: true},
});




// userSchema.plugin(uniqueValidator);

module.exports = mongoose.model('User', userSchema)