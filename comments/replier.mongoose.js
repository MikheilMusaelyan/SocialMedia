const mongoose = require('mongoose');
const replierSchema = mongoose.Schema({
    comment: {type:String, required: true},
    image: {type:String, required: true},
    creatorId: {type:String, required: true},
    postId: {type:String, required: true},
    creatorPic: {type:String, required: true},
    creatorNickname: {type:String, required: true},
    date: {type:Date, default: Date.now(), required: true, immutable: true}
});
module.exports = mongoose.model('Replier', replierSchema);