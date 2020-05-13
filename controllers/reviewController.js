//const mongoose = require('mongoose');
const Review = require('../models/reviewModel');
//const catchAsync = require('../utils/catchAsync');
const factory = require('./handlerFactory');

// exports.getAllReviews = catchAsync(async (request, response, next) => {
//   let filter = {};
//   if(request.params.tourId) {
//      filter = {tour: request.params.   tourId};
//   }
//   const reviews = await Review.find(filter);
//   response.status(200).json({
//     status: 'success',
//     // requestedAt: request.requestTime,
//     results: reviews.length,
//     data: {
//       reviews: reviews,
//     },
//   });
// });

exports.setTourUserIds = (request, response, next) => {
  // Allow Nested Routes
  if (!request.body.tour) {
    request.body.tour = request.params.tourId;
  }
  if (!request.body.user) {
    request.body.user = request.user.id;
  }
  next();
};
// exports.createReview = catchAsync(async (request, response, next) => {
//   const newReview = await Review.create(request.body);
//   response.status(201).json({
//     status: 'success',
//     data: {
//       review: newReview,
//     },
//   });
// });

exports.getAllReviews = factory.getAll(Review);
exports.createReview = factory.createOne(Review);
exports.getReview = factory.getOne(Review);
exports.updateReview = factory.updateOne(Review);
exports.deleteReview = factory.deleteOne(Review);
