const mongoose = require('mongoose');

const postSchema = mongoose.Schema({
    post: {type: String, required: true},
    image: {type: String, required: false},
    comments: {type: Array, required: true},
    likes: {type: Number, required: true},
    creatorId: {type: String, required: true, immutable: true, ref: 'User'},
    date: {type: Date, default: new Date(), immutable: true, required: true},
    creatorProfilePic: {type: String, required: false},
    creatorNickname: {type: String, required: true},
    commentsLength: {type: Number, required: true, minLength: 0}
});

module.exports = mongoose.model('Post', postSchema)