const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
    try{
        const token = req.headers.auth.split(" ")[1];
        const verifiedT = jwt.verify(token, process.env.JWT_SECRET_KEY);
        req.userData = {email: verifiedT.email, userId: verifiedT.userId}
        next()
    } catch (error) {
        res.status(401).json({ message: 'You\'re not authenticated' })
    }
}