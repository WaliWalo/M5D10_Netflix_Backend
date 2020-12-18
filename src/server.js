const cors = require("cors");
const express = require("express");
const listEndpoints = require("express-list-endpoints");
const medias = require("./services/medias");
const { join } = require("path");
const helmet = require("helmet");
const yaml = require("yamljs");
const swaggerUI = require("swagger-ui-express");
const {
  badRequestHandler,
  notFoundHandler,
  unauthorizedHandler,
  forbiddenHandler,
  catchAllHandler,
} = require("./errorHandling");

const hostname = "localhost";
const port = process.env.PORT || 3001;
const publicImageFile = join(__dirname, "../public/img/medias");
const publicPdfFile = join(__dirname, "../public/pdf");
const whiteList =
  process.env.NODE_ENV === "production"
    ? [process.env.FE_PROD]
    : [process.env.FE_DEV];

const corsOptions = {
  origin: function (origin, callback) {
    if (whiteList.indexOf(origin) !== -1) {
      // allowed
      callback(null, true);
    } else {
      // Not allowed
      callback(new Error("NOT ALLOWED - CORS ISSUES"));
    }
  },
};
const server = express();
server.use(helmet());
server.use(cors(corsOptions));
server.use(express.json());
server.use(express.static(publicImageFile));
server.use(express.static(publicPdfFile));

// const swaggerDoc = yaml.load(join(__dirname, "apiDoc.yml")); //PARSING YAML FILE

// server.use("/docs", swaggerUI.serve, swaggerUI.setup(swaggerDoc));
server.use("/medias", medias);

//ERROR MIDDLEWARE GOES HERE
// ERROR MIDDLEWARE MUST HAPPEN LAST
server.use(badRequestHandler);
server.use(notFoundHandler);
server.use(unauthorizedHandler);
server.use(forbiddenHandler);
server.use(catchAllHandler);

console.log(listEndpoints(server));

server.listen(port, () => {
  if (process.env.NODE_ENV === "production") {
    console.log("Running on cloud on port", port);
  } else {
    console.log("Running locally on port", port);
  }
});
