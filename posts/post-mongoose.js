const mongoose = require('mongoose');
const postSchema = require('./singlepost-mongoose')

const postsSchema = mongoose.Schema({
    posts: [postSchema]
})
module.exports = mongoose.model('Post', postsSchema)