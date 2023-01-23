const express = require('express');
const app = express();

const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser')

const userRoutes = require('./auth/auth');
const postRoutes = require('./posts/posts');
const messages = require('./messages/messages');
const cors = require('cors');

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());


const mongoose = require('mongoose');

mongoose.set('strictQuery', false);
mongoose.connect(`mongodb+srv://${process.env.DB_USERNAME}:${process.env.DB_PASSWORD}@mikescluster.aootk6w.mongodb.net/?retryWrites=true&w=majority`,
{
    useNewUrlParser: true, 
    useUnifiedTopology: true
})
.then(data => {
    console.log('connected!')
})
.catch(err => {
    console.log('unable to connect!')
})
console.log('-------------------------------------------------------------------------------- change *')
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
    res.setHeader("set-cookie", "cross-site-cookie=name; SameSite=None; Secure");
    next();
});

app.use(function (req, res, next) {
    res.cookie('name', 'value', {
        sameSite: 'None',
        secure: true,
        httpOnly: true
    });
    next();
});

app.use('/posts', postRoutes);
app.use('/users', userRoutes);
app.use('/messages', messages)
app.get('/', (req, res) => {
    res.send('Hello World!!!');
});


module.exports = app