const Tour = require('../models/tourModel');
const User = require('../models/userModel');
const Booking = require('../models/bookingModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

exports.getOverview = catchAsync(async (request, response, next) => {
  // 1). GET tour data from collection.
  const tours = await Tour.find({});
  // 2). Build Template.

  // 3). Render that template using the tour data from step 1.
  response.status(200).render('overview', {
    title: 'All Tours',
    tours: tours,
  });
});

exports.getTour = catchAsync(async (request, response, next) => {
  const tour = await Tour.findOne({
    slug: request.params.slug,
  }).populate({
    path: 'reviews',
    select: 'review rating user',
  });
  if (!tour) {
    return next(new AppError('There is no tour with that name!', 404));
  }
  response.status(200).render('tour', {
    title: `${tour.name} Tour`,
    tour: tour,
  });
});

exports.getLoginForm = (request, response) => {
  response.status(200).render('login', {
    title: 'Log into your account',
  });
};

exports.getAccount = (request, response) => {
  response.status(200).render('account', {
    title: 'Your account',
  });
};

exports.getMyTours = catchAsync(async (request, response, next) => {
  // 1) Find all bookings
  const bookings = await Booking.find({
    user: request.user.id,
  });

  // 2) Find tours with the returned IDs
  const tourIDs = bookings.map((element) => {
    return element.tour;
  });
  const tours = await Tour.find({ _id: { $in: tourIDs } });
  // $in operator will match the ids with all the elements of tourIDs, ana return all the matches.

  response.status(200).render('overview', {
    title: 'My Tours',
    tours: tours,
  });
});

exports.updateUserData = catchAsync(async (request, response, next) => {
  const updatedUser = await User.findByIdAndUpdate(
    request.user.id,
    {
      name: request.body.name,
      email: request.body.email,
    },
    {
      new: true,
      runValidators: true,
    }
  );
  response.status(200).render('account', {
    title: 'Your account',
    user: updatedUser,
  });
});
