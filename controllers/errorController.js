const AppError = require('../utils/appError');

const handleCastErrorDB = (error) => {
  const message = `Invalid ${error.path}: ${error.value}.`;
  return new AppError(message, 400);
};

const handleDuplicateFieldsDB = (error) => {
  const value = error.errmsg.match(/(["'])(\\?.)*?\1/)[0];
  const message = `Duplicate field value: ${value}. Please use another value.`;
  return new AppError(message, 400);
};

const handleValidationErrorDB = (error) => {
  const errors = Object.values(error.errors).map((element) => {
    return element.message;
  });
  const message = `Invalid input data. ${errors.join('. ')}`;
  return new AppError(message, 400);
};

const handleJWTerror = () => {
  return new AppError('Invalid token. Please log in again!', 401);
};

const handleJWTExpiredError = () => {
  return new AppError('Your token has expired. Please log in again!', 401);
};

const sendErrorDev = (error, request, response) => {
  // API
  if (request.originalUrl.startsWith('/api')) {
    // originalUrl is the Url without the host.
    return response.status(error.statusCode).json({
      status: error.status,
      error: error,
      message: error.message,
      stack: error.stack,
    });
  }
  // RENDERED WEBSITE
  console.log('ERROR!', error);
  return response.status(error.statusCode).render('error', {
    title: 'Something went wrong!',
    msg: error.message,
  });
};

const sendErrorProd = (error, request, response) => {
  // API
  if (request.originalUrl.startsWith('/api')) {
    // Operational, trusted errors: send message to client
    if (error.isOperational) {
      return response.status(error.statusCode).json({
        status: error.status,
        message: error.message,
      });
      // Programming or other unknown error: Don't leak error details.
    }
    console.error('ERROR', error);
    return response.status(500).json({
      status: 'error',
      message: 'Something went very wrong!',
    });
  }
  /// RENDERED WEBSITE
  // Operational, trusted errors: send message to client
  if (error.isOperational) {
    return response.status(error.statusCode).render('error', {
      title: 'Something went wrong!',
      msg: error.message,
    });
    // Programming or other unknown error: Don't leak error details.
  }
  return response.status(error.statusCode).render('error', {
    title: 'Something went wrong!',
    msg: 'Please try again later!',
  });
};

module.exports = (error, request, response, next) => {
  error.statusCode = error.statusCode || 500;
  // error.statusCode should be equal to itself if it is defined (if it is not undefined). If it is undefined, it should be equal to 500.
  error.status = error.status || 'error';
  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(error, request, response);
  } else if (process.env.NODE_ENV === 'production') {
    // eslint-disable-next-line node/no-unsupported-features/es-syntax
    let err = { ...error };
    err.message = error.message;
    if (err.name === 'CastError') {
      err = handleCastErrorDB(err);
    }
    if (err.code === 11000) {
      err = handleDuplicateFieldsDB(err);
    }
    if (err.name === 'ValidationError') {
      err = handleValidationErrorDB(err);
    }
    if (err.name === 'JsonWebTokenError') {
      err = handleJWTerror();
    }
    if (err.name === 'TokenExpiredError') {
      err = handleJWTExpiredError();
    }
    sendErrorProd(err, request, response);
  }
};
