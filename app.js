const express = require('express');
const app = express();

const bodyParser = require('body-parser');

const userRoutes = require('./auth/auth');
const postRoutes = require('./posts/posts');
const activeUsersRoutes = require('./auth/activeUsers');
const messages = require('./messages/messages')

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use('/images', express.static('backend/images'))

const mongoose = require('mongoose');

const {DB_USERNAME, DB_PASSWORD} = process.env

mongoose.set('strictQuery', false);
mongoose.connect(`mongodb+srv://${DB_USERNAME}:${DB_PASSWORD}@mikescluster.aootk6w.mongodb.net/?retryWrites=true&w=majority`)
.then(data => {
    console.log('connected!')
})
.catch(err => {
    console.log('unable to connect')
})

app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', "*");
    res.setHeader(
        'Access-Control-Allow-Headers',
        'Origin, X-Requested-With, Content-Type, Accept, auth'
    );
    res.setHeader(
        'Access-Control-Allow-Methods',
        'POST, GET, PATCH, PUT, DELETE, OPTIONS'
    );
    next();
});

app.use('/posts', postRoutes);
app.use('/users', userRoutes);
app.use('/activeUsers', activeUsersRoutes);
app.use('/messages', messages)
app.get('/', (req, res) => {
    res.send('Hello World!!!');
});


module.exports = app