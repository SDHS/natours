class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.status = toString(this.statusCode).startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;
    // isOperationalError. We only want to use this class for operational errors.
    Error.captureStackTrace(this, this.constructor);
    // This way, our constructor won't appear in the stack trace and pollute it.
  }
}

module.exports = AppError;
