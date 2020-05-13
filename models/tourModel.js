const mongoose = require('mongoose');
const slugify = require('slugify');
// const User = require('./userModel');
// const validator = require('validator');

const tourSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'A tour must have a name'],
      unique: true,
      trim: true,
      maxlength: [
        40,
        'A tour name must have less or equal than 40 characters.',
      ],
      minlength: [
        10,
        'A tour name must have more or equal than 10 characters.',
      ],
      // maxlength and minlength are for strings only
      //validate: [validator.isAlpha, 'A tour name can only have alphabets!'],
    },
    slug: String,
    duration: {
      type: Number,
      required: [true, 'A tour must have a duration!'],
    },
    maxGroupSize: {
      type: Number,
      required: [true, 'A tour must have a group size!'],
    },
    difficulty: {
      type: String,
      required: [true, 'A tour must have a difficulty!'],
      enum: {
        values: ['easy', 'medium', 'difficult'],
        message: 'Difficulty is either: easy, medium, or difficult',
        // we can use enum to specify the alllowed values. (Only for strings.)
      },
    },
    ratingsAverage: {
      type: Number,
      default: 4.5,
      min: [1, 'Rating must be above 1.0'],
      max: [5, 'Rating must be below 5.0'],
      // min and max are only available on Number and Date.
      set: (val) => Math.round(val * 10) / 10,
      // this function is run each time a new value is set for this field.
      // Math.round rounds to the nearest integer. For example, it will round 4.6666 to 5, which we do not want. To get around this, we have to use a trick. We multiply the current value by 10. So, 4.666 would become 46.666, and then that will be rounded to 47. Then, we can divide this value again by 10 to get 4.7.
    },
    ratingsQuantity: {
      type: Number,
      default: 0,
    },
    price: {
      type: Number,
      required: [true, 'A tour must have a price'],
    },
    priceDiscount: {
      type: Number,
      validate: {
        message: 'Value of discount ({VALUE}) must be less than the price.',
        // this validator can only be used when creating a document, not when updating it.
        validator: function (value) {
          return value < this.price;
          // checking whether the value of the price discount is less than the actual price of the document.
          // if true, there is no error, if false then there'll be an error.
        },
      },
    },
    summary: {
      type: String,
      trim: true,
      // trim only works for strings. It removes all the whitespace at the beginning and at the end.
      required: [true, 'A tour must have a summary!'],
    },
    description: {
      type: String,
      trim: true,
    },
    imageCover: {
      type: String,
      // usually in the database, the name of the image is stored, which is then accessed through the file system. We CAN store images in the database, but that is usually not a good idea, so we just store the name.
      required: [true, 'A tour must have a cover image!'],
    },
    images: [String], // that is how we specify an array of strings in the Schema.
    createdAt: {
      type: Date,
      default: Date.now(), // Date.now() returns the current time in ms, but MongoDB automatically cconverts it into the Date to make more sense of the data.
      select: false,
      // to hide this property from the client when a query is performed. Maybe because it contains sensitive data that shouldn't be exposed to the client.
    },
    startDates: [Date], // startDates are basically different dates at which the tour starts. Like different dates for the same tour. First it will happen in December, for example, then February, and so on...
    secretTour: {
      type: Boolean,
      default: false,
    },
    startLocation: {
      // GeoJSON to specify geospatial data. Now we're not describing the schema type options object here, but actually this is an embedded object. To be able to recognize this object as GeoJSON, we need the type and coordinates property. Now, each of these fields with get their own SCHEMA TYPE OPTIONS OBJECT.
      type: {
        type: String,
        default: 'Point',
        // we can specify different geometries in MongoDB, like polygons, and lines. But, right now we need point.
        enum: ['Point'],
      },
      coordinates: [Number],
      // first longitude, then latitude
      // latitude: the horizontal position measured in degrees starting from the equator
      // longitude: the vertical position measured in degrees starting from the meridian.
      address: String,
      description: String,
    },
    locations: [
      {
        type: {
          type: String,
          default: 'Point',
          enum: ['Point'],
        },
        coordinates: [Number],
        address: String,
        description: String,
        day: Number,
      },
    ],
    // locations: array of embedded documents. To do this, we need to define the schema of those objects inside an array.
    guides: [
      {
        type: mongoose.Schema.ObjectId,
        // refers to a mongoose Schema object
        ref: 'User', // objects are of type user.
      },
    ],
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// tourSchema.index({ price: 1 });
tourSchema.index({ price: 1, ratingsAverage: -1 });

tourSchema.index({ slug: 1 });

tourSchema.index({ startLocation: '2dsphere' });

tourSchema.virtual('durationWeeks').get(function () {
  return this.duration / 7;
});

// VIRTUAL POPULATE
// ref, foreignField, and localField is how we connect the two collections together.
tourSchema.virtual('reviews', {
  ref: 'Review',
  foreignField: 'tour',
  localField: '_id',
});

tourSchema.pre('save', function (next) {
  // executed before saving or creating the document.
  //console.log(this); // this points to the currently process middleware.
  // we want to create a slug of the tour before we save it into the database (pre). Slug is basically a string that we may use in the URL to refer to a particular tour.
  this.slug = slugify(this.name, { lower: true });
  // we first need to make sure that there's a slug property defined in the schema.
  next();
});

// THIS IS FOR EMBEDDING, WHICH WE AREN'T DOING FOR TOUR GUIDES. WE ARE USING REFERENCING.
// tourSchema.pre('save', async function (next) {
//   const guidesPromises = this.guides.map(async (id) => await User.findById(id));
//   this.guides = await Promise.all(guidesPromises);
//   next();
// });
// we have passed in an array of ids for the users as the propertyValue of guides. But, before saving, instead of just the ids, we need to embed the Users belonging to those ids into guides and thus the tour collection, so for that, we use the above pre-save middleware.

// DOCUMENT MIDDLEWARE
// tourSchema.pre('save', function (next) {
//   console.log('Will save document...');
//   next();
// });

// tourSchema.post('save', function (document, next) {
// document is the document that was just saved to the database. In pre, we refer to it using 'this', but here, since its already saved, we get a variable 'document' to refer to it.
//   console.log(document);
//   next();
// });

// QUERY MIDDLEWARE
tourSchema.pre(/^find/, function (next) {
  this.find({ secretTour: { $ne: true } });
  this.start = Date.now();
  next();
});

tourSchema.pre(/^find/, function (next) {
  this.populate({
    path: 'guides',
    select: '-__v -passwordChangedAt',
  });
  next();
});
// populate() populates the document by using the references contained within the field that we have specified and then using the reference to display all the related data of that reference. This happens only in the query and not in the actual database. So, our tour and user collections remain separate in the database.
tourSchema.post(/^find/, function (documents, next) {
  console.log(`Query took ${Date.now() - this.start} milliseconds.`);
  // here we get access to all the documents that were returned from the query.
  //console.log(documents);
  next();
});

// AGGREGATION MIDDLEWARE
// tourSchema.pre('aggregate', function (next) {
//   this.pipeline().unshift({ $match: { secretTour: { $ne: true } } });
//   // unshift() is a standard JavaScript feature to add an element at the beginning of an array. Shift is used to add it to the end. pipeline() returns an array, consisting of all the stages of the aggregation pipeline. We want to add a $match stage at the beginning, excluding secret tours so that they aren't shown.
//   // console.log(this.pipeline());
//   // this points to the current aggregation object.
//   next();
// });
const Tour = mongoose.model('Tour', tourSchema);
// middleware runs for all events that start with find.

module.exports = Tour;
