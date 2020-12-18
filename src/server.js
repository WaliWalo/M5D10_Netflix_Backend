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
const server = express();
server.use(helmet());
server.use(cors());
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

server.listen(port, hostname, () => {
  console.log(`Server running at http://${hostname}:${port}/`);
});
