const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const APIFeatures = require('../utils/apiFeatures');

exports.deleteOne = (Model) =>
  catchAsync(async (request, response, next) => {
    const document = await Model.findByIdAndDelete(request.params.id);
    if (!document) {
      return next(new AppError('No document found with that ID!', 404));
    }
    response.status(204).json({
      status: 'success',
      data: null,
    });
    // 204 means NO CONTENT. We send data as null in DELETE.
  });

exports.updateOne = (Model) =>
  catchAsync(async (request, response, next) => {
    const { id } = request.params;
    const document = await Model.findByIdAndUpdate(id, request.body, {
      new: true,
      runValidators: true,
    });
    if (!document) {
      return next(new AppError('No document found with that ID', 404));
    }
    response.status(200).json({
      status: 'success',
      data: {
        data: document,
      },
    });
  });

exports.createOne = (Model) =>
  catchAsync(async (request, response, next) => {
    const document = await Model.create(request.body);
    response.status(201).json({
      status: 'success',
      data: {
        data: document,
      },
      // 201 is for created
    });
  });

exports.getOne = (Model, popOptions) =>
  catchAsync(async (request, response, next) => {
    const { id } = request.params;
    let query = Model.findById(id);
    if (popOptions) {
      query = query.populate(popOptions);
    }
    const document = await query;
    if (!document) {
      return next(new AppError('No document found with that ID!', 404));
    }
    response.status(200).json({
      status: 'success',
      data: {
        data: document,
      },
    });
  });

exports.getAll = (Model) =>
  catchAsync(async (request, response, next) => {
    // TO ALLOW FOR NESTED GET REVIEWS ON TOUR (HACK)
    let filter = {};
    if (request.params.tourId) {
      // to get the reviews only for a particular tour if tourId exists on the route.
      filter = {
        tour: request.params.tourId,
      };
    }
    const features = new APIFeatures(Model.find(filter), request.query)
      .filter()
      .sort()
      .limitFields()
      .paginate();
    const documents = await features.query;
    //.explain()
    response.status(200).json({
      status: 'success',
      results: documents.length,
      data: {
        documents: documents,
      },
    });
  });
// goal here is to create functions that will then return other functions. Such functions are calle 'factory functions'.
// Here, we use the arrow operator to return a function that returns the required function.
