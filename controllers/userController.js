const multer = require('multer');
const sharp = require('sharp');
const User = require('../models/userModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const factory = require('./handlerFactory');

// const multerStorage = multer.diskStorage({
//   destination: (request, file, cb) => {
//     cb(null, 'public/img/users');
//   },
//   filename: (request, file, cb) => {
//     // user-userId-currentTimeStamp.ext
//     // user-4588538dbae3-485948353.jpg
//     // With user id and timestamps, we guarantee that there won't be two images with the same filenames, and no overwrite will happen.
//     const ext = file.mimetype.split('/')[1];
//     // file object is the  same as request.file that we logged to the console.
//     cb(null, `user-${request.user.id}-${Date.now()}.${ext}`);
//   },
// });

const multerStorage = multer.memoryStorage(); // to save pics to memory rather than HDD. We have to resize them first using sharp, then we will store them to HDD. Now, the image will be stored as a buffer.
// When storing images as buffer, the filename property doesn't get set. So, we have to set it manually.

const multerFilter = (request, file, cb) => {
  if (file.mimetype.startsWith('image')) {
    cb(null, true);
  } else {
    cb(new AppError('Not an image! Please upload only images!', 400), false);
  }
};

const upload = multer({
  storage: multerStorage,
  fileFilter: multerFilter,
});

exports.resizeUserPhoto = catchAsync(async (request, response, next) => {
  if (!request.file) {
    return next();
  }
  request.file.filename = `user-${request.user.id}-${Date.now()}.jpeg`;
  await sharp(request.file.buffer)
    .resize(500, 500)
    .toFormat('jpeg')
    .jpeg({ quality: 90 })
    .toFile(`public/img/users/${request.file.filename}`);

  next();
});

exports.uploadUserPhoto = upload.single('photo');

const filterObj = (obj, ...allowedFields) => {
  const newObj = {};
  Object.keys(obj).forEach((el) => {
    if (allowedFields.includes(el)) {
      newObj[el] = obj[el];
    }
  });
  return newObj;
};

exports.getMe = (request, response, next) => {
  request.params.id = request.user.id;
  next();
};

exports.updateMe = catchAsync(async (request, response, next) => {
  // this is updating by the user itself. We also have an updateUser() function, that is for updation of the user data by the administrator.

  // 1). Create error if the user POSTs password data. (As it is handled through PATCH and updatePassword() function)
  if (request.body.password || request.body.passwordConfirm) {
    return next(
      new AppError(
        'This route is not for password updates! Please use /updateMyPassword'
      ),
      400
    );
  }

  // 2). Update user document
  /*
  NOTE: We simply cannot update all the properties that the user has PATCHed in the body. Because, let's suppose, the user passes in role: "admin". Then, that would allow the user administrator privileges. So, doing that is a big big mistake. We need to make sure that the properties to be updated are 'safe' properties. Right now, these 'safe' properties are only 'name', and 'email'.
  */

  // 2). Filter out unwanted field names that aren't allowed to be updated.
  const filteredBody = filterObj(request.body, 'name', 'email');
  if (request.file) {
    filteredBody.photo = request.file.filename;
  }
  const updatedUser = await User.findByIdAndUpdate(
    request.user.id,
    filteredBody,
    {
      new: true,
      runValidators: true,
    }
  );

  response.status(200).json({
    status: 'success',
    data: {
      user: updatedUser,
    },
  });
});

exports.deleteMe = catchAsync(async (request, response, next) => {
  // we do not actually delete the user from the database. We only set the status of the user to false, meaning inactive. So that if or when the user wants to join our application again, his/her data can be restored again.
  await User.findByIdAndUpdate(request.user.id, {
    active: false,
  });
  response.status(204).json({
    status: 'success',
    data: null,
  });
});

exports.createUser = (request, response) => {
  response.status(500).json({
    status: 'error',
    message: 'This route is not yet defined! Please use /signup instead!',
    // 500 means internal server error
  });
};

exports.getUser = factory.getOne(User);
exports.getAllUsers = factory.getAll(User);
// DO NOT UPDATE PASSWORDS WITH THIS AS THE SAVE MIDDLEWARE WILL NOT RUN!
exports.updateUser = factory.updateOne(User);

exports.deleteUser = factory.deleteOne(User);
