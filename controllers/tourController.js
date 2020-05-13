const multer = require('multer');
const sharp = require('sharp');
const Tour = require('../models/tourModel');
const catchAsync = require('../utils/catchAsync');
const factory = require('./handlerFactory');
const AppError = require('../utils/appError');

// tours = JSON.parse(
//   fs.readFileSync(`${__dirname}/../dev-data/data/tours-simple.json`)
// );

// exports.checkID = (request, response, next, value) => {
//   console.log(`Tour ID is: ${value}`);
//   if (request.params.id * 1 > tours.length) {
//     return response.status(404).json({
//       status: 'fail',
//       message: 'invalid ID',
//     });
//   }
//   next();
// };

// exports.checkBody = (request, response, next) => {
//   if (!request.body.name || !request.body.price) {
//     return response.status(400).json({
//       status: 'fail',
//       message: 'Data is incomplete!',
//     });
//   }
//   next();
// };

const multerStorage = multer.memoryStorage();

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

exports.uploadTourImages = upload.fields([
  {
    name: 'imageCover',
    maxCount: 1,
  },
  {
    name: 'images',
    maxCount: 3,
  },
]);

// upload.single('image') -> request.file
// upload.fields([ {}, {} ]) -> request.files
// upload.array('images', 5) -> request.files

exports.resizeTourImages = catchAsync(async (request, response, next) => {
  if (!request.files.imageCover || !request.files.images) {
    return next();
  }

  // COVER IMAGE
  request.body.imageCover = `tour-${
    request.params.id
  }-${Date.now()}-cover.jpeg`;
  await sharp(request.files.imageCover[0].buffer)
    .resize(2000, 1333)
    .toFormat('jpeg')
    .jpeg({ quality: 90 })
    .toFile(`public/img/tours/${request.body.imageCover}`);

  // IMAGES
  request.body.images = [];
  await Promise.all(
    request.files.images.map(async (file, i) => {
      const filename = `tour-${request.params.id}-${Date.now()}-${i + 1}.jpeg`;
      await sharp(file.buffer)
        .resize(2000, 1333)
        .toFormat('jpeg')
        .jpeg({ quality: 90 })
        .toFile(`public/img/tours/${filename}`);
      request.body.images.push(filename);
    })
  );
  next();
});

exports.aliasTopTours = (request, response, next) => {
  request.query.limit = '5';
  request.query.sort = '-ratingsAverage,price';
  request.query.fields = 'name,price,ratingsAverage,summary,difficulty';
  next();
};

// exports.getAllTours = catchAsync(async (request, response, next) => {
// // BUILD QUERY
// // 1A. Filtering
// const queryObj = { ...request.query };
// // if we were just to dod queryObj = req.query, then we will not have a hard object. To get a hard object, we will have to do what we did above. Now, if we change something in queryObj, that change won't be reflected in request.query.
// const excludedFields = ['page', 'sort', 'limit', 'fields'];
// excludedFields.forEach((el) => {
//   delete queryObj[el];
// });
// // 1B. ADVANCED FILTERING
// // If we want to include relational operators in our query too, then they would look something like this in MongoDB:
// /*
// {
//   difficulty: 'easy',
//   duration: {$gte: 5}
// }
// However, in request.query, it would look something like:
// {
//   difficulty: 'easy',
//   duration: {gte: 5}
// }
// So the only difference is that of the $ symbol.
// Specifying the relational operators in the URL look something like:
// /tours?difficulty=easy&duration[gte]=5
// */
// // console.log(request.query, queryObj);
// // stores the query in the URL as an object.
// let queryString = JSON.stringify(queryObj);
// queryString = queryString.replace(
//   /\b(gte|gt|lte|lt)\b/g,
//   (matchedWord) => `$${matchedWord}`
// );
// let query = Tour.find(JSON.parse(queryString));
// Unlike before, we cannot simply await here, because we have to use the sort(), limit() etc methods. So, we have to implement a middle part here. First we will store the result of find() in query and then, after invoking sort() etc will we then store the result in tours.

// Tour.find() returns a query.
// console.log(request.requestTime);
// const query = Tour.find()
//   .where('duration')
//   .equals(5)
//   .where('difficulty')
//   .equals('easy');
// // 2. SORTING
// if (request.query.sort) {
//   //const sortBy = request.query.sort.split(',').join(' ');
//   // split the sort property by comma, then join the words  by a comma.
//   const sortBy = request.query.sort.replace(/,/g, ' ');
//   // Normally replace() only replaces the first instance. To replace all instances, we need to pass in the global modifier along with a regex.
//   // in the URL, the sorting properties are delimited by a comma, but the sort() requires them to be delimited by spaces. So we have implemented that here.
//   query = query.sort(sortBy);
//   // if there is a tie, then we can break the tie by specifying a second property with which to sort. This is done by passing a string to the sort() which is of the format:
//   // 'propertyOne propertyTwo ... propertyN '
//   // sort by value of the property 'sort' in the object request.query
// } else {
//   query = query.sort('-createdAt');
// }

// 3. FIELD LIMITING
/*
      This feature allows us to basically allow the client to choose which specific fields he wants to receive. By limiting other fields, he/she can save on bandwith on each request.
      In the URL, the fields that a client wants are specified by:
      /?fields=fieldOne,fieldTwo,...,fieldN
    */
// if (request.query.fields) {
//   const fields = request.query.fields.replace(/,/g, ' ');
//   query.select(fields);
// query.select() allows us to select only the fields that are in fields. So, basically, as an argument, it accepts the name of fields that a client wants separated by ' '.
// This operation of selecting certain field names is called projecting.
// } else {
//   query = query.select('-__v');
// __v field is used internally by Mongoose, but the client doesn't really need it. So in the event that no projection is done, we want to show all the data except __v. To exclude a field, we pass in the following string:
// -fieldOne, -fieldTwo,..., fieldN
// }

// //4. PAGINATION
// /*
// Suppose that we have 1000 documents in our collection. It is quite cumbersome to display all that data in a single page. To divide these documments, we implement pagination so we can separate them into different pages. This is done in the URL using:
// /page=a&limit=b
// where a,b E Z+
// value of page defines the page number that we are at, and the value of limit defines the number of documents to be displayed at each page.
// */
// const page = request.query.page * 1 || 1;
// // || defautValue, if request.query.page is falsy
// const limitValue = request.query.limit * 1 || 100;
// const skipValue = limitValue * (page - 1);
// query = query.skip(skipValue).limit(limitValue);
// // skip() is the amount of results that should be skipped before actually querying the data.
// // skip(limit * (page - 1))
// // We are not using skip values, but instead page value, because its much easier for the user to deal with pages.
// if (request.query.page) {
//   const totalTours = await Tour.countDocuments(); // returns the total number of documents in the collection tours
//   if (skipValue >= totalTours) {
//     throw new Error('This page does not exist!');
//     // THrowing an error in this try block means that we'll move to its catch block whenever this error is encountered.
//   }
// }
// EXECUTE QUERY
// const features = new APIFeatures(Tour.find(), request.query)
//   .filter()
//   .sort()
//   .limitFields()
//   .paginate();
// const tours = await features.query;
// At this point, after passing our query through filtering, sorting, field limiting, pagination all that stuff, our query might look like
// query.sort().select().skip().limitI()...
// Each of these methods return a query.
// That is why we chose to first use query variable as a middleman, and then await it to get our tours.
// SEND RESPONSE
//   response.status(200).json({
//     status: 'success',
//     // requestedAt: request.requestTime,
//     results: tours.length,
//     data: {
//       tours: tours,
//     },
//   });
// });
exports.getAllTours = factory.getAll(Tour);

exports.getTour = factory.getOne(Tour, {
  path: 'reviews',
});

// exports.getTour = catchAsync(async (request, response, next) => {
//   const { id } = request.params;
//   const tour = await Tour.findOne({
//     _id: id,
//   }).populate('reviews');
//   // findById is a helper function for writing findOne({
//   //  _id: id,
//   // });
//   // So, instead of writing what I wrote above, we can also use Tour.findById(). It performs exactly the same function as above. We can also use find() and then pass in the filter object, but since we know that only one document would have the ID that we're looking for, so we can just use findOne(), and then as soon as the document is found, MongoDB can stop searching for others.

//   if (!tour) {
//     return next(new AppError('No tour found with that ID', 404));
//   }
//   response.status(200).json({
//     status: 'success',
//     data: {
//       tour: tour,
//     },
//   });
// console.log(request.params);
// in above resource, :id is a variable. request.params stores all the variables that we define. To define a variable, use : before it. To make a variable optional, sandwich it inbetween : and ?, like :id?
// const id = request.params.id * 1;
// originally, request.params stores in strings. So, we have multiplied it with 1 to convert it to a number, to make the comparison accurate.
// if (id > tours.length) {
//     return response.status(404).json({
//         status: 'fail',
//         message: 'Invalid ID',
//     });
// }
// const tour = tours.find((el) => el.id === id);
// creates an array that contains elements where the condition is true. Here, only one element will return true, which is the tour that we want.
//   if (!tour) {
//     return response.status(404).json({
//       status: 'fail',
//       message: 'Invalid ID',
//     });
//   }
// response.status(200).json({
//   status: 'success',
//   data: {
//     tour: tour,
//   },
// });
// });

exports.createTour = factory.createOne(Tour);
// exports.createTour = catchAsync(async (request, response, next) => {
//   // const newTour = Tour({});
//   // newTour.save();
//   const newTour = await Tour.create(request.body);
//   response.status(201).json({
//     status: 'success',
//     data: {
//       tour: newTour,
//     },
//   });
// });

exports.updateTour = factory.updateOne(Tour);

// exports.updateTour = catchAsync(async (request, response, next) => {
//   //   if (request.params.id * 1 > tours.length) {
//   //     return response.status(404).json({
//   //       status: 'fail',
//   //       message: 'Invalid ID',
//   //     });
//   //   }
//   const { id } = request.params;
//   const tour = await Tour.findByIdAndUpdate(id, request.body, {
//     new: true,
//     runValidators: true,
//   });
//   if (!tour) {
//     return next(new AppError('No tour found with that ID', 404));
//   }
//   response.status(200).json({
//     status: 'success',
//     data: {
//       tour: tour,
//     },
//   });
// });

exports.deleteTour = factory.deleteOne(Tour);

// exports.deleteTour = catchAsync(async (request, response, next) => {
//   const { id } = request.params;
//   const tour = await Tour.findByIdAndDelete(id);
//   if (!tour) {
//     return next(new AppError('No tour found with that ID', 404));
//   }
//   response.status(204).json({
//     status: 'success',
//     data: null,
//   });
// });

exports.getTourStats = catchAsync(async (request, response, next) => {
  const stats = await Tour.aggregate([
    {
      $match: {
        ratingsAverage: { $gte: 4.5 },
      },
    },
    {
      $group: {
        _id: {
          $toUpper: '$difficulty',
        },
        // if we want all the results together, then we set _id to null. However, if we want to group them based on a certain field value, then we specify that field value in the _id. EXAMPLE:
        // _id: '$difficulty' will return resullts grouped on the basis of difficulty. Like, it'll give us the average for hard, medium, and easy tours separately.
        numTours: { $sum: 1 },
        // add 1 for each document.
        numRatings: { $sum: '$ratingsQuantity' },
        avgRating: { $avg: '$ratingsAverage' },
        avgPrice: { $avg: '$price' },
        minPrice: { $min: '$price' },
        maxPrice: { $max: '$price' },
      },
    },
    {
      $sort: {
        averagePrice: 1,
        // 1 for ASC
      },
    },
    // {
    //   $match: {
    //     _id: { $ne: 'EASY' },
    //   },
    // },
  ]);
  response.status(200).json({
    status: 'success',
    data: {
      stats: stats,
    },
  });
});

exports.getMonthlyPlan = catchAsync(async (request, response, next) => {
  const year = request.params.year * 1;
  const plan = await Tour.aggregate([
    {
      $unwind: '$startDates',
      // unwind deconstructs an array field from input documents and then output one document for each element of the array
    },
    {
      $match: {
        startDates: {
          $gte: new Date(`${year}-01-01`),
          $lte: new Date(`${year}-12-31`),
        },
      },
    },
    {
      $group: {
        _id: { $month: '$startDates' },
        numTourStarts: { $sum: 1 },
        tours: { $push: '$name' },
        // $push is used to create an array
      },
    },
    {
      $addFields: { month: '$_id' },
      // used to add fields.
    },
    {
      $project: {
        _id: 0,
        // if field is set to 0, then it won't show.
      },
    },
    {
      $sort: { numTourStarts: -1 },
      // -1 is for DESC
    },
    {
      $limit: 12,
    },
  ]);
  response.status(200).json({
    status: 'success',
    results: plan.length,
    data: {
      plan: plan,
    },
  });
});
// /tours-within/233/center/34.11175,-118.113491/unit/mi
exports.getToursWithin = catchAsync(async (request, response, next) => {
  const { distance, latlng, unit } = request.params;
  const [lat, lng] = latlng.split(',');
  const radius = unit === 'mi' ? distance / 3963.2 : distance / 6378.1;
  // to convert our distance into radians, we have to divide it by the radius of the Earth. If the distance given is in miles, then we divide it my the radius in miles, other wise by the radius in kms. The distance is needed in radians because MongoDB requires it.
  if (!lat || !lng) {
    next(
      new AppError(
        'Please provide latitude and longitude in the format lat,lng.',
        400
      )
    );
  }
  const tours = await Tour.find({
    startLocation: {
      $geoWithin: {
        $centerSphere: [[lng, lat], radius],
      },
    },
  });
  response.status(200).json({
    status: 'success',
    results: tours.length,
    data: {
      data: tours,
    },
  });
});

exports.getDistances = catchAsync(async (request, response, next) => {
  const { latlng, unit } = request.params;
  const [lat, lng] = latlng.split(',');
  const multiplier = unit === 'mi' ? 0.000621371 : 0.001;
  if (!lat || !lng) {
    next(
      new AppError(
        'Please provide latitude and longitude in the format lat,lng.',
        400
      )
    );
  }
  const distances = await Tour.aggregate([
    {
      $geoNear: {
        near: {
          type: 'Point',
          coordinates: [lng * 1, lat * 1],
        },
        distanceField: 'distance',
        distanceMultiplier: multiplier,
      },
    },
    // geoNear is the only geospatial pipeline stage, and it always needs to be the first stage. geoNear requires that one of our fields contain a geospatial index. (Which we have already done on startLocation). If theres only one geospatial field with an index, then the geoNear will automatically use that index in order to perform the calculation. In case of multiple geospatial indexes, use the keys field to specify the index.
    // In near, we specify the point from which the distances are to be calculated using GEOJson.
    // distanceField is the name of the field that will be created and where all the distances will be stored.
    {
      $project: {
        distance: 1,
        name: 1,
      },
    },
  ]);
  response.status(200).json({
    status: 'success',
    data: {
      data: distances,
    },
  });
});
