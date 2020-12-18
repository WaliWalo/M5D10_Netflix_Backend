const badRequestHandler = (err, req, res, next) => {
  if (err.httpStatusCode === 400) {
    res.status(400).send(err.message);
  }
  next(err); //GO TO NEXT HANDLER IF ITS NOT 404
};

const notFoundHandler = (err, req, res, next) => {
  if (err.httpStatusCode === 404) {
    res.status(404).send("Not found!");
  }
  next(err); //GO TO NEXT HANDLER IF ITS NOT 404
};

const unauthorizedHandler = (err, req, res, next) => {
  if (err.httpStatusCode === 401) {
    res.status(401).send("Unauthorized!");
  }
  next(err);
};

const forbiddenHandler = (err, req, res, next) => {
  if (err.httpStatusCode === 403) {
    res.status(403).send("Forbidden!");
  }
  next(err);
};

const catchAllHandler = (err, req, res, next) => {
  if (!res.headersSent) {
    res.status(err.httpStatusCode || 500).send(err.message);
  }
};

module.exports = {
  badRequestHandler,
  notFoundHandler,
  unauthorizedHandler,
  forbiddenHandler,
  catchAllHandler,
};
