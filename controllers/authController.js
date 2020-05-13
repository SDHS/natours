const crypto = require('crypto');
const { promisify } = require('util');
// getting promisify function from util using ES6 destructuring.
const jwt = require('jsonwebtoken');
const User = require('../models/userModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const Email = require('../utils/email');

const signToken = (id) => {
  return jwt.sign(
    {
      id: id, // our payload
    },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRES_IN,
    }
  );
};

const createSendToken = (user, statusCode, response) => {
  const token = signToken(user._id);
  const cookieOptions = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
    ),
    // client deletes the cookie after it expires.
    //secure: true,
    // use HTTPS
    httpOnly: true,
    // cannot be accessed or modified by the browser in any way. It can only receive it and store it.
  };
  if (process.env.NODE_ENV === 'production') {
    cookieOptions.secure = true;
  }
  response.cookie('jwt', token, cookieOptions);
  // defining a cookie. Arguments are: cookie name, cookie value, and cookie options.

  // remove password from output
  user.password = undefined;
  response.status(statusCode).json({
    status: 'success',
    token: token,
    data: {
      user: user,
    },
  });
};

exports.signup = catchAsync(async (request, response, next) => {
  const newUser = await User.create(request.body);
  const url = `${request.protocol}://${request.get('host')}/me`;
  // console.log(url);
  await new Email(newUser, url).sendWelcome();
  createSendToken(newUser, 201, response);
});

exports.login = catchAsync(async (request, response, next) => {
  const { email, password } = request.body;
  // above, we have used object destructuring. So, what this basically means is when we want to assign a value to our variable whose name is the same as the variable name, then we can enclose our variable in curly brackets, and omit using the value on the RHS. This is helpful in the case of multiple assignments as above. Basically, the above line accomplishes the same thing as the following:
  // const email = request.body.email;
  // const password = request.body.password;

  // 1). Check if email and password exists in the body. (if they arent undefined)
  if (!email || !password) {
    return next(new AppError('Please provide email and password', 400));
  }
  // 2). Check if user exists && password is correct.
  const user = await User.findOne({
    email: email,
  }).select('+password');
  // since password by default is select: false, it wont be included in our user document. However, we need it in over to verify user credentials. To include a field that is by default not included, we have to pass in the + sign. We have to explicitly select() the password.
  if (!user || !(await user.correctPassword(password, user.password))) {
    // we havent stored the result of the second condition in any variable because we first want to verify whether the user actually exists or not. If he doesnt exist, and then we query for user.password, then we'll get an error. So, only in the case that the user exists do we want to then check whether the password is correct. In the if statement, if the first condition returns true, i.e. the user does not exist, then the second condition will not even run, thus prompting no error.
    return next(new AppError('Incorrect email and/or password!', 401));
    // 401 is unauthorized
  }
  // 3). If everything is okay, send jwt back to client.
  createSendToken(user, 200, response);
});

exports.logout = (request, response) => {
  response.cookie('jwt', 'loggedOut', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true,
  });
  // we cannot delete the cookie since the httpOnly property is set to true, so we cannot manipulate it in any way. So, in order to log users out, we send another cookie with the same name as jwt, but with a different value, so that the cookie may be overwritten.
  response.status(200).json({
    status: 'success',
  });
};

exports.protect = catchAsync(async (request, response, next) => {
  // 1). Get token and if it isn't undefined
  /*
    Tokens are stored in the request.header. The standard that is followed to store the token is:
    Key          : Value
    Authorization: Bearer <token-value>
  */
  let token;
  if (
    request.headers.authorization &&
    request.headers.authorization.startsWith('Bearer')
  ) {
    token = request.headers.authorization.split(' ')[1];
    // split() splits the value of authorization into ['Bearer', '<token-value>']. We want the second element.
  } else if (request.cookies.jwt) {
    token = request.cookies.jwt;
  }
  if (!token) {
    return next(
      new AppError('You are not logged in! Please log in to get access!', 401)
    );
  }
  // 2). Verify the token
  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);
  // 3). Check if the user still exists.
  const currentUser = await User.findById(decoded.id);
  if (!currentUser) {
    return next(
      new AppError('The user belonging to this token no longer exists.', 401)
    );
  }
  // 4). Check if user changed password after the token was issued.
  if (currentUser.changedPasswordAfter(decoded.iat)) {
    // iat = issued at
    return next(
      new AppError('User recently changed password! Pleaes log in again!', 401)
    );
  }
  // next(): Grant access to protected route.
  request.user = currentUser;
  // put the user data onto the request, because we may need it in the next middleware. Remember, request object is the one that travels from middleware to middleware
  response.locals.user = currentUser;
  next();
});

// Only for rendered pages, no errors
exports.isLoggedIn = async (request, response, next) => {
  try {
    if (request.cookies.jwt) {
      // 1) Verify token
      const decoded = await promisify(jwt.verify)(
        request.cookies.jwt,
        process.env.JWT_SECRET
      );
      // 2). Check if the user still exists.
      const currentUser = await User.findById(decoded.id);
      if (!currentUser) {
        return next();
      }
      // 3). Check if user changed password after the token was issued.
      if (currentUser.changedPasswordAfter(decoded.iat)) {
        // iat = issued at
        return next();
      }
      // THERE IS A LOGGED IN USER
      response.locals.user = currentUser;
      // we can do response.locals.anyVariable = value, and then our pug templates will get access to.
    }
    return next();
  } catch (err) {
    return next();
  }
};

exports.restrictTo = (...roles) => {
  // ...roles passes in an arbitrary number of arguments. roles is an array, consisting of the roles that are allowed to delete or whatever a resource. It is most likely: ['admin', 'lead-guide']
  return (request, response, next) => {
    if (!roles.includes(request.user.role)) {
      return next(
        new AppError('You do not have permission to perform this action!', 403)
      );
      // 403 means forbidden
    }
    next();
  };
};
// we cannot really pass in arguments in a middleware except request, response, next, and error for an error handler. So, if we really want to pass in arguments, then we have to wrap our middleware function around another function, that will take in the arguments that we want to pass and basically return the middleware function. Therefore, due to scoping rules. we shall now have access to the required arguments in our middleware function. Remember, in JavaScript, due to closure, an inner function has access to the variables of the outer function, even after the outer function has returned.

exports.forgotPassword = catchAsync(async (request, response, next) => {
  // 1). Get user based on POSTed email
  const user = await User.findOne({
    email: request.body.email,
  });
  if (!user) {
    return next(new AppError('There is no user with that email address!'), 404);
  }
  // 2). Generate the random reset token (NOT JWT)
  const resetToken = user.createPasswordResetToken();
  await user.save({ validateBeforeSave: false });

  // 3). Send it to user's email

  // const message = `Forgot your password? Submit a PATCH request with your new password and passwordConfirm to: ${resetURL}.\nIf you didn't forget your password, please ignore this email!`;

  try {
    // await sendEmail({
    //   email: user.email,
    //   subject: 'Your password reset token (valid for 10 minutes)',
    //   message: message,
    // });
    const resetURL = `${request.protocol}://${request.get(
      'host'
    )}/api/v1/users/resetPassword/${resetToken}`;

    await new Email(user, resetURL).sendPasswordReset();
  } catch (err) {
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });
    return next(
      new AppError(
        'There was an error sending the email. Try again later!',
        500
      )
    );
  }

  response.status(200).json({
    status: 'success',
    message: 'Token sent to email!',
  });
});
exports.resetPassword = catchAsync(async (request, response, next) => {
  // 1). Get user based on the token.
  const hashedToken = crypto
    .createHash('sha256')
    .update(request.params.token)
    .digest('hex');
  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  });
  // 2). If token has not expired, and there is user, set the new password.
  if (!user) {
    return next(new AppError('Token is invalid or has expired!', 400));
  }
  user.password = request.body.password;
  user.passwordConfirm = request.body.passwordConfirm;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();
  // 3). Update changedPasswordAt property for the current user.
  // 4). Log the user in, send JWT
  createSendToken(user, 200, response);
});

exports.updatePassword = catchAsync(async (request, response, next) => {
  // 1). Get user from collection.
  const user = await User.findById(request.user.id).select('+password');
  // 2). Check if the POSTed password is correct.
  if (
    !(await user.correctPassword(request.body.passwordCurrent, user.password))
  ) {
    return next(
      new AppError('The entered password is invalid. Please try again!', 401)
    );
  }
  // 3). If password is correct, update the password.
  user.password = request.body.password;
  user.passwordConfirm = request.body.passwordConfirm;
  await user.save();
  // 4). Log user in. (Send JWT).
  createSendToken(user, 200, response);
});
