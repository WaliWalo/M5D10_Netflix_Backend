const express = require("express");
const fs = require("fs"); //import to read and write file
const path = require("path"); //for relative pathing to json file
const uniqid = require("uniqid"); //for generating unique id for each student
const router = express.Router();
const Joi = require("joi");
const multer = require("multer");
const {
  readDB,
  writeDB,
  getMedias,
  getReviews,
  writeMedia,
  writeReview,
} = require("../../lib/utilities");
const { writeFile } = require("fs-extra");
const upload = multer({});
const axios = require("axios");
const { promisify } = require("util");
const { parse } = require("path");
const { Transform } = require("json2csv");
const { pipeline } = require("stream");
const PDFDocument = require("pdfkit");
const { createReadStream, createWriteStream } = require("fs-extra");
const nodemailer = require("nodemailer");
const fetch = require("node-fetch");
const mediasPublicFilePath = path.join(__dirname, "../../../public/img/medias");
const pdfPublicFilePath = path.join(__dirname, "../../../public/pdf");
const fontFilePath = path.join(__dirname, "../../fonts/Roboto-Regular.ttf");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("../../cloudinary");
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "netflix",
  },
});

const cloudinaryMulter = multer({ storage: storage });
//-----------------------------------------------------------------Media------------------------------------------------------------------------
//{
//     "Title": "The Lord of the Rings: The Fellowship of the Ring",
//     "Year": "2001",
//     "imdbID": "tt0120737",  //UNIQUE
//     "Type": "movie",
//     "Poster": "https://m.media-amazon.com/images/M/MV5BMTM5MzcwOTg4MF5BMl5BanBnXkFtZTgwOTQwMzQxMDE@._V1_SX300.jpg"
//     "Reviews": ["reviewid"]
// }

const validateMediaInput = (dataToValidate) => {
  const schema = Joi.object().keys({
    title: Joi.string().min(3).max(30).required(),
    year: Joi.number().min(1900).max(2021).required(),
    imdbId: Joi.string().min(3).required(),
    type: Joi.string().required(),
  });

  console.log(schema.validate(dataToValidate));
  return schema.validate(dataToValidate); //error,value
};

const validateReviewInput = (dataToValidate) => {
  const schema = Joi.object().keys({
    comment: Joi.string().min(3).max(200).required(),
    rate: Joi.number().min(1).max(5).required(),
  });

  console.log(schema.validate(dataToValidate));
  return schema.validate(dataToValidate); //error,value
};
// "/" GET ALL MEDIA, should return the movies sorted by the Avg Rate value from the reviews ratings
// GET media with title containing "book" (must be possible to filter also for year and type)
router.get("/", async (req, res, next) => {
  try {
    const mediaDb = await getMedias();
    const reviewDb = await getReviews();
    const { title, year, type } = req.query;
    let respond = [];
    if (type === undefined && year === undefined && title === undefined) {
      //const reviews = [];
      let tempMediaDb = [...mediaDb];

      mediaDb.forEach((media, index) => {
        if (!media.reviews) {
          //reviews.push(0);
          tempMediaDb[index].review = 0;
        } else {
          let mediaRate = 0;
          // for each review in the media, find the review in reviewdb
          media.reviews.forEach((singleReview) => {
            let selectedReview = reviewDb.find(
              (review) => review._id === singleReview
            );
            mediaRate = mediaRate + selectedReview.rate;
          });

          tempMediaDb[index].review = mediaRate;
        }
      });
      tempMediaDb.sort((a, b) => (a.review > b.review ? 1 : -1)).reverse();
      res.status(200).send(tempMediaDb);
    } else if (year === undefined && type === undefined) {
      console.log("1");
      respond = mediaDb.filter((media) => media.title.includes(title));
      if (respond) {
        res.status(200).send(respond);
      } else {
        let error = new Error();
        error.httpStatusCode = 404;
        next(error);
      }
    } else if (type === undefined) {
      console.log("2");
      respond = mediaDb
        .filter((media) => media.title.includes(title))
        .filter((filtered) => {
          console.log(typeof filtered.year, typeof year);
          return filtered.year.toString() === year;
        });
      if (respond) {
        res.status(200).send(respond);
      } else {
        let error = new Error();
        error.httpStatusCode = 404;
        next(error);
      }
    } else if (title && year && type) {
      respond = mediaDb
        .filter((media) => media.title.includes(title))
        .filter((filtered) => filtered.year.toString() === year)
        .filter((filterType) => filterType.type === type);
      console.log("3");
      if (respond) {
        res.status(200).send(respond);
      } else {
        let error = new Error();
        error.httpStatusCode = 404;
        next(error);
      }
    } else if (year === undefined) {
      respond = mediaDb
        .filter((media) => media.title.includes(title))
        .filter((filterType) => filterType.type === type);
      if (respond) {
        res.status(200).send(respond);
      } else {
        let error = new Error();
        error.httpStatusCode = 404;
        next(error);
      }
    }
  } catch (error) {
    next(error);
  }
});

// "/:mediaId" GET MEDIA BY ID FROM OMDB USING IMDBID
router.get("/:mediaId", async (req, res, next) => {
  try {
    const response = await axios({
      method: "get",
      url: `http://www.omdbapi.com/?i=${req.params.mediaId}&apikey=${process.env.OMDBKEY}`,
    });
    //console.log(response);
    if (response.data.Error) {
      let error = new Error();
      error.httpStatusCode = 404;
      next(error);
    } else {
      res.status(200).send(response.data);
    }
  } catch (error) {
    next(error);
  }
});

// "/" POST A MEDIA FRONT END MUST PROVIDE IMDBID
router.post("/", async (req, res, next) => {
  try {
    const { error } = validateMediaInput(req.body);
    if (error) {
      let err = new Error();
      err.message = error.details[0].message;
      err.httpStatusCode = 400;
      next(err);
    } else {
      const response = await axios({
        method: "get",
        url: `http://www.omdbapi.com/?i=${req.body.imdbId}&apikey=${process.env.OMDBKEY}`,
      });
      if (response.data.Error) {
        let error = new Error();
        error.httpStatusCode = 404;
        next(error);
      } else {
        let mediaDB = await getMedias();
        let newMedia = req.body;
        newMedia._id = uniqid();
        mediaDB.push(newMedia);
        await writeMedia(mediaDB);
        res.status(200).send(newMedia);
      }
    }
  } catch (error) {
    next(error);
  }
});

// "/:mediaId" UPDATE A MEDIA
router.put("/:mediaId", async (req, res, next) => {
  try {
    const { error } = validateMediaInput(req.body);
    if (error) {
      let err = new Error();
      err.message = error.details[0].message;
      err.httpStatusCode = 400;
      next(err);
    } else {
      let mediaDB = await getMedias();
      let selectedMedia = mediaDB.find(
        (media) => media._id === req.params.mediaId
      );
      let mediaDBWithoutSelectedMedia = mediaDB.filter(
        (media) => media._id !== req.params.mediaId
      );
      const response = await axios({
        method: "get",
        url: `http://www.omdbapi.com/?i=${req.body.imdbId}&apikey=${process.env.OMDBKEY}`,
      });
      console.log(response);
      if (response.data.Error) {
        let error = new Error();
        error.httpStatusCode = 404;
        next(error);
      } else {
        selectedMedia = {
          ...req.body,
          _id: selectedMedia._id,
          reviews: selectedMedia.reviews,
        };
        mediaDBWithoutSelectedMedia.push(selectedMedia);
        await writeMedia(mediaDBWithoutSelectedMedia);
        res.status(200).send(selectedMedia);
      }
    }
  } catch (error) {
    next(error);
  }
});

// "/:mediaId" DELETE A MEDIA
router.delete("/:mediaId", async (req, res, next) => {
  try {
    const mediasDB = await getMedias();
    const mediaDBWithoutSelectedMedia = mediasDB.filter(
      (media) => media._id !== req.params.mediaId
    );
    const selectedMedia = mediasDB.find(
      (media) => media._id === req.params.mediaId
    );
    const reviewsDB = await getReviews();
    let newReviewDB = [...reviewsDB];
    if (selectedMedia.reviews) {
      selectedMedia.reviews.forEach((selectedMediaReview) => {
        newReviewDb.filter((review) => review._id !== selectedMediaReview);
      });
      await writeReview(newReviewDB);
    }
    await writeMedia(mediaDBWithoutSelectedMedia);
    res.status(200).send(mediaDBWithoutSelectedMedia);
  } catch (error) {
    next(error);
  }
});

// "/:mediaId/upload" POST AN IMAGE TO MEDIA
router.post(
  "/:mediaId/upload",
  cloudinaryMulter.single("media"),
  async (req, res, next) => {
    try {
      console.log(req.file);
      const mediaDB = await getMedias();
      const selectedMedia = mediaDB.find(
        (media) => media._id === req.params.mediaId
      );
      const mediaDBWithoutSelectedMedia = mediaDB.filter(
        (media) => media._id !== req.params.mediaId
      );
      if (selectedMedia) {
        // const imageUrl = path.join(
        //   mediasPublicFilePath,
        //   `${req.params.mediaId}.jpg`
        // );
        // await writeFile(imageUrl, req.file.buffer);
        selectedMedia.imageUrl = req.file.path;
        mediaDBWithoutSelectedMedia.push(selectedMedia);
        await writeMedia(mediaDBWithoutSelectedMedia);
        res.status(200).send(selectedMedia);
      } else {
        let error = new Error();
        error.httpStatusCode = 404;
        next(error);
      }
    } catch (error) {
      next(error);
    }
  }
);

// "/catalogue?title=whatever" GET a PDF containing all the movies containing the given word in the title
router.get("/catalogue/downloadPdf", async (req, res, next) => {
  try {
    const mediaDB = await getMedias();
    if (req.query.title && mediaDB) {
      const filtered = mediaDB.filter((media) =>
        media.title.includes(req.query.title)
      );
      //   const pdfUrl = path.join(
      //     pdfPublicFilePath,
      //     `${req.query.title + new Date()}.pdf`
      //   );

      //   const doc = new PDFDocument();
      //   doc.pipe(
      //     fs.createWriteStream(
      //       path.join(pdfPublicFilePath, `${req.query.title + new Date()}.pdf`)
      //     )
      //   );

      //   if (filtered.length > 0) {
      //     // filtered.forEach((media) => {
      //     //   doc.font(fontFilePath).fontSize(25).text(media.title, 100, 100);
      //     //   doc.image(media.imageUrl, {
      //     //     fit: [250, 300],
      //     //     align: "center",
      //     //     valign: "center",
      //     //   });
      //     // });
      //     doc.font(fontFilePath).fontSize(25).text("media.title", 100, 100);
      //     console.log("test");
      //   } else {
      //     doc.font(fontFilePath).fontSize(25).text("NOTHING FOUND", 100, 100);
      //   }

      //   res.setHeader(
      //     "Content-Disposition",
      //     `attachment; filename=${req.query.title + new Date()}.pdf`
      //   );
      //   doc.pipe(res);
      //   doc.end();
      let doc = new PDFDocument();
      doc.pipe(fs.createWriteStream(`adsf.pdf`));
      doc.font(fontFilePath).fontSize(25).text("asdf", 100, 100);

      res.setHeader("Content-Disposition", `attachment; filename=adsf.pdf`);

      doc.pipe(res);
      doc.end();
      //   await writeFile(pdfUrl, req.file.buffer);
      res.status(200).send("Success");
    }
  } catch (error) {
    next(error);
  }
});

// "/sendCatalogue?title=whatever&email=a@a.com" should send and email with the catalogue that match the title to the
//  given address in the req.body:
// { title=whatever,email=my@email.com}
router.post("/catalogue/sendCatalogue", async (req, res, next) => {
  try {
    const mediaDB = await getMedias();

    const filtered = mediaDB.filter((media) =>
      media.title.includes(req.query.title)
    );

    if (req.query.title && req.query.email && filtered.length > 0) {
      // Generate test SMTP service account from ethereal.email
      // Only needed if you don't have a real mail account for testing
      let testAccount = await nodemailer.createTestAccount();

      // create reusable transporter object using the default SMTP transport
      let transporter = nodemailer.createTransport({
        host: "smtp.ethereal.email",
        port: 587,
        secure: false, // true for 465, false for other ports
        auth: {
          user: testAccount.user, // generated ethereal user
          pass: testAccount.pass, // generated ethereal password
        },
      });
      // send mail with defined transport object
      let info = await transporter.sendMail({
        from: '"Fred Foo 👻" <foo@example.com>', // sender address
        to: req.query.email, // list of receivers
        subject: "Hello ✔", // Subject line
        text: "Hello world?", // plain text body
        html: `<b>Hi, this is your requested media. Query: ${req.query.title} <img src = "${filtered[0].imageUrl}"/></b>
        <p>Here's a nyan cat for you as an embedded attachment:<br/><img src="https://i.pinimg.com/originals/e8/65/bd/e865bd7c7395936f91b116ba6d827aad.gif"/></p>`, // html body
        // attachments: [
        //   // File Stream attachment
        //   {
        //     filename: `${selectedProduct._id}.pdf`,
        //     path: path.join(__dirname, `../../../${selectedProduct._id}.pdf`),
        //     cid: selectedProduct._id, // should be as unique as possible
        //     contentType: "application/pdf",
        //   },
        // ],
      });
      console.log("IMAGE URL", filtered[0].imageUrl);
      console.log("Message sent: %s", info.messageId);
      console.log("Preview URL: %s", nodemailer.getTestMessageUrl(info));
      res.status(200).send("Success");
    }
  } catch (error) {
    next(error);
  }
});

// "/search?query=whatever" given a title in the query search in omdb catalogue by title
router.get("/search/query", async (req, res, next) => {
  try {
    console.log(req.query.query);
    if (req.query.query) {
      const response = await axios({
        method: "get",
        url: `http://www.omdbapi.com/?s=${req.query.query}&apikey=${process.env.OMDBKEY}`,
      });

      if (response.data.Error) {
        let error = new Error();
        error.httpStatusCode = 404;
        next(error);
      } else {
        res.status(200).send(response.data);
      }
    } else {
      let error = new Error();
      error.httpStatusCode = 404;
      next(error);
    }
  } catch (error) {
    next(error);
  }
});

//-----------------------------------------------------------------REVIEWS------------------------------------------------------------------------
// {
//     "_id": "123455", //SERVER GENERATED
//     "comment": "A good book but definitely I don't like many parts of the plot", //REQUIRED
//     "rate": 3, //REQUIRED, max 5
//     "elementId": "5d318e1a8541744830bef139", //REQUIRED = IMDBID/MEDIA ID
//     "createdAt": "2019-08-01T12:46:45.895Z" // SERVER GENERATED
// }
// "/:mediaId/reviews" GET ALL REVIEWS OF A MEDIA
router.get("/:mediaId/reviews", async (req, res, next) => {
  try {
    const mediaDB = await getMedias();
    const reviewDB = await getReviews();
    let reviewsForMedia = reviewDB.filter((review) => {
      return review.elementId === req.params.mediaId;
    });
    console.log(reviewsForMedia);
    if (reviewsForMedia.length === 0) {
      let err = new Error();
      err.httpStatusCode = 404;
      next(err);
    } else {
      res.status(200).send(reviewsForMedia);
    }
  } catch (error) {
    next(error);
  }
});

// "/:mediaId/reviews" POST A REVIEW ON A MEDIA
// have to check if media exist
router.post("/:mediaId/reviews", async (req, res, next) => {
  try {
    const { error } = validateReviewInput(req.body);
    if (error) {
      let err = new Error();
      err.message = error.details[0].message;
      err.httpStatusCode = 400;
      next(err);
    } else {
      const reviewDB = await getReviews();
      const mediaDB = await getMedias();
      let selectedMedia = mediaDB.find(
        (media) => media._id === req.params.mediaId
      );
      let mediaDBWithoutSelectedMedia = mediaDB.filter(
        (media) => media._id !== req.params.mediaId
      );
      let newReview = {
        ...req.body,
        elementId: req.params.mediaId,
        _id: uniqid(),
        createdAt: new Date(),
      };
      if (!selectedMedia.reviews) {
        selectedMedia.reviews = [];
        selectedMedia.reviews.push(newReview._id);
      } else {
        selectedMedia.reviews.push(newReview._id);
      }
      mediaDBWithoutSelectedMedia.push(selectedMedia);

      reviewDB.push(newReview);
      await writeMedia(mediaDBWithoutSelectedMedia);
      await writeReview(reviewDB);
      res.status(200).send(newReview);
    }
  } catch (error) {
    next(error);
  }
});

// "/:mediaId/reviews/:reviewId" UPDATE A REVIEW
router.put("/:mediaId/reviews/:reviewId", async (req, res, next) => {
  try {
    const { error } = validateReviewInput(req.body);
    if (error) {
      let err = new Error();
      err.message = error.details[0].message;
      err.httpStatusCode = 400;
      next(err);
    } else {
      const reviewDB = await getReviews();
      const reviewDBWithoutSelectedReview = reviewDB.filter(
        (review) => review._id !== req.params.reviewId
      );
      const newReview = {
        ...req.body,
        elementId: req.params.mediaId,
        _id: req.params.reviewId,
        updatedAt: new Date(),
      };
      reviewDBWithoutSelectedReview.push(newReview);
      await writeReview(reviewDBWithoutSelectedReview);
      res.status(200).send(newReview);
    }
  } catch (error) {
    next(error);
  }
});

// "/:mediaId/reviews/:reviewId" DELETE A REVIEW
router.delete("/:mediaId/reviews/:reviewId", async (req, res, next) => {
  try {
    const reviewDB = await getReviews();
    const mediaDB = await getMedias();

    const mediaIndex = mediaDB.findIndex(
      (media) => media._id === req.params.mediaId
    );
    if (mediaIndex !== -1) {
      let reviewIndex = mediaDB[mediaIndex].reviews.findIndex(
        (review) => review === req.params.reviewId
      );
      if (reviewIndex !== -1) {
        mediaDB[mediaIndex].reviews.splice(reviewIndex, 1);
        let newReviewDB = reviewDB.filter(
          (review) => review._id !== req.params.reviewId
        );
        await writeReview(newReviewDB);
        await writeMedia(mediaDB);
        res.status(200).send(mediaDB[mediaIndex]);
      } else {
        const err = new Error();
        err.httpStatusCode = 404;
        next(err);
      }
    } else {
      const err = new Error();
      err.httpStatusCode = 404;
      next(err);
    }
  } catch (error) {
    next(error);
  }
});

module.exports = router;
