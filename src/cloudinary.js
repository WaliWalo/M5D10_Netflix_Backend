const cloudinary = require("cloudinary").v2;
cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.API_KEY,
  api_secret: process.env.API_SECRET,
});
module.exports = cloudinary;

// to use import cloudinary and multer and multer-storage-cloudinary
// create a storage with cloudinary storage
// const storage = new CloudinaryStorage({
//   cloudinary, //credentials
//   params: { folder: "strivetest" }, //options, use this folder on cloudinary
// });

// const cloudinaryStorage = multer({ storage: storage });
