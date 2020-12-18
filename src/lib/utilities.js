const { writeJSON, readJSON, readdir } = require("fs-extra");
const { join } = require("path");

const mediasFilePath = join(__dirname, "../services/medias/medias.json");
const reviewsFilePath = join(__dirname, "../services/medias/reviews.json");
const readDB = async (filePath) => {
  try {
    const fileJSON = await readJSON(filePath);
    return fileJSON;
  } catch (error) {
    throw new Error(error);
  }
};

const writeDB = async (filePath, data) => {
  //writing on disk
  try {
    await writeJSON(filePath, data);
  } catch (error) {
    throw new Error(error);
  }
};

module.exports = {
  getMedias: async () => readDB(mediasFilePath),
  writeMedia: async (media) => writeDB(mediasFilePath, media),
  getReviews: async () => readDB(reviewsFilePath),
  writeReview: async (review) => writeDB(reviewsFilePath, review),
};
