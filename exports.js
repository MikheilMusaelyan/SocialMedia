const express = require('express');
const multer = require('multer');


const mimeTypes = {
    'image/png': 'png',
    'image/jpeg': 'jpeg',
    'image/jpg': 'jpg'
}

const storage = multer.diskStorage({
    filename: (req, file, cb) => {
        const fileName = file.originalname.toLowerCase().split(" ").join('-');
        cb(null, fileName + '-' + Date.now() + '.' + mimeTypes[file.mimetype])
    }
});
const upload = multer({storage: storage});


const cloudinary = require('cloudinary').v2;
cloudinary.config({
    cloud_name: process.env.CLOUD_NAME, 
    api_key: process.env.API_KEY,
    api_secret: process.env.API_SECRET,
    secure: true
});

function uploadOnCloud(file) {
    return cloudinary.uploader.upload(file.path, {folder: "my-folder", resource_type: "image"})
}

module.exports = {
    upload,
    uploadOnCloud
}