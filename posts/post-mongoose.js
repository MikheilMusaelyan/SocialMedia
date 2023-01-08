const mongoose = require('mongoose');

const postsSchema = mongoose.Schema({
    posts: {type: Array}
})
module.exports = mongoose.model('Posts', postsSchema)