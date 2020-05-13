const mongoose = require('mongoose');
const Tour = require('./tourModel');

const reviewSchema = mongoose.Schema(
  {
    review: {
      type: String,
      required: [true, 'Review can not be empty!'],
    },
    rating: {
      type: Number,
      min: 1,
      max: 5,
    },
    createdAt: {
      type: Date,
      default: Date.now(),
    },
    tour: {
      type: mongoose.Schema.ObjectId,
      ref: 'Tour',
      required: [true, 'Review must belong to a tour!'],
    },
    user: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: [true, 'Review must belong to a user!'],
    },
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

reviewSchema.index({ tour: 1, user: 1 }, { unique: true });
// to prevent duplicate reviews. the combination of user and tour ids must be unique.

reviewSchema.pre(/^find/, function (next) {
  // this.populate({
  //   path: 'tour',
  //   select: 'name',
  // }).populate({
  //   path: 'user',
  //   select: 'name photo',
  // });
  this.populate({
    path: 'user',
    select: 'name photo',
  });
  next();
});

reviewSchema.statics.calcAverageRatings = async function (tourId) {
  // console.log(tourId);
  // In static methods, the 'this' keyword points to the current model. So, we can use this.aggregate()
  const stats = await this.aggregate([
    {
      $match: {
        tour: tourId,
      },
    },
    {
      $group: {
        _id: '$tour',
        nRatings: {
          $sum: 1,
        },
        avgRating: {
          $avg: '$rating',
        },
      },
    },
  ]);
  // console.log(stats);
  if (stats.length > 0) {
    await Tour.findByIdAndUpdate(tourId, {
      ratingsQuantity: stats[0].nRatings,
      ratingsAverage: stats[0].avgRating,
    });
  } else {
    await Tour.findByIdAndUpdate(tourId, {
      ratingsQuantity: 0,
      ratingsAverage: 4.5,
    });
  }
};

reviewSchema.post('save', function () {
  // this points to current document after it is saved.
  // Review.calcAverageRatings(). But, we cannot do that since Review (model) must be declared after all the middlewares are set. So, we use this.constructor instead of Review. It works because this points to the current document, and .constructor is the Model who created the document.
  this.constructor.calcAverageRatings(this.tour._id);
});
// right now, this calcAverageRatings will only work on create, not on update and delete, because update and delete are done by findByIdAndUpdate/Delete, and not by saving. For these, we do not have document midleware, only query middleware. So, we cannot use the same logic that we used above.
// To go around this limitation, we will use the query to give us the document, and then we can do what we did above.
// NOTE: In the backend, findByIdAndUpdate/Delete use FindOneAndUpdate/Delete, so we have set the hook on them.
// Now we have access to the document we want, but there is another problem. We are using pre to get access to the this keyword. So, if we were to now use the calcAvgRatings function, we will be using it on non-updated data, since pre hook works before the data is saved to the database. But, if we use post, then we lose access to the this keyword.
// to get around this, we have to use another trick. We have to send data from the pre hook to the post hook by saving it on the this object.
reviewSchema.pre(/^findOneAnd/, async function (next) {
  this.r = await this.findOne();
  console.log(this.r);
  next();
});

reviewSchema.post(/^findOneAnd/, async function () {
  // await this.findOne(); does NOT work here because query has already executed.
  await this.r.constructor.calcAverageRatings(this.r.tour);
});

const Review = mongoose.model('Review', reviewSchema);

module.exports = Review;
