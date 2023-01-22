const express = require('express');
const multer = require('multer');


const mimeTypes = {
    'image/png': 'png',
    'image/jpeg': 'jpeg',
    'image/jpg': 'jpg'
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        let isValid = mimeTypes[file.mimetype];
        let error = new Error('Image is not valid');
        if(isValid){
            error = null;
        }
        cb(error, 'images')
    },
    filename: (req, file, cb) => {
        const fileName = file.originalname.toLowerCase().split(" ").join('-');
        cb(null, fileName + '-' + Date.now() + '.' + mimeTypes[file.mimetype])
    }
});
const upload = multer({storage: storage});

function uploadOnCloud(CLOUDINARY, file) {
    return CLOUDINARY.uploader.upload(file.path, {folder: "my-folder", resource_type: "image"})
}


module.exports = {
    upload,
    uploadOnCloud
}