const express = require('express');
const reviewController = require('../controllers/reviewController');
const authController = require('../controllers/authController');

const router = express.Router({ mergeParams: true });
// we have specified this option (mergeParams) so that when this router is used from the tourRouter, (when a user wants to publish a review on a specific tour), then this reviewRouter here should get access to the tourId parameter defined in the tourRoutes. Usually, a router has access to the parameters of only THEIR specific routes. However, using mergeParams, we can get access to all the previous parameters that exist before this route was requested.

router.use(authController.protect);

router
  .route('/')
  .get(reviewController.getAllReviews)
  .post(
    authController.restrictTo('user'),
    reviewController.setTourUserIds,
    reviewController.createReview
  );

router
  .route('/:id')
  .get(reviewController.getReview)
  .delete(
    authController.restrictTo('user', 'admin'),
    reviewController.deleteReview
  )
  .patch(
    authController.restrictTo('user', 'admin'),
    reviewController.updateReview
  );

module.exports = router;
