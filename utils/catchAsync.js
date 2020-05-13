module.exports = (fn) => {
  return (request, response, next) => {
    fn(request, response, next).catch((err) => {
      next(err);
    });
  };
};
