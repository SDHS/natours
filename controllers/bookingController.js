const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const Tour = require('../models/tourModel');
const Booking = require('../models/bookingModel');
const catchAsync = require('../utils/catchAsync');
const factory = require('./handlerFactory');
const AppError = require('../utils/appError');

exports.getCheckoutSession = catchAsync(async (request, response, next) => {
  // 1) Get the currently booked tour
  const tour = await Tour.findById(request.params.tourID);

  // 2) Create checkout session
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    success_url: `${request.protocol}://${request.get('host')}/?tour=${
      request.params.tourID
    }&user=${request.user.id}&price=${tour.price}`,
    cancel_url: `${request.protocol}://${request.get('host')}/tour/${
      tour.slug
    }`,
    customer_email: request.user.email,
    client_reference_id: request.params.tourID,
    line_items: [
      {
        name: `${tour.name} Tour`,
        description: tour.summary,
        images: [`https://www.natours.dev/img/tours/${tour.imageCover}`],
        amount: tour.price * 100,
        // amount is expected to be in cents.
        currency: 'usd',
        quantity: 1,
      },
    ],
  });
  // 3) Create session as response
  response.status(200).json({
    status: 'success',
    session: session,
  });
});

exports.createBookingCheckout = catchAsync(async (request, response, next) => {
  // TEMPORARY, because its unsecure. Everyone can make bookings without paying.
  const { tour, user, price } = request.query;
  if (!tour && !user && !price) {
    return next();
  }
  await Booking.create({
    tour: tour,
    user: user,
    price: price,
  });
  response.redirect(request.originalUrl.split('?')[0]);
  // redirect basically creates a new request to the URL we pass in. Here, we have removed the query string from the URL to make it a bit more secure.
  // When we are redirected to the given route, the first middleware in the stack will again be this createBookingCheckout. But, now, since we have removed the query string, the tour, user, and price will no longer be defined. So, we'll simply go to the next middleware in the stack.
});

exports.createBooking = factory.createOne(Booking);
exports.getBooking = factory.getOne(Booking);
exports.getAllBookings = factory.getAll(Booking);
exports.updateBooking = factory.updateOne(Booking);
exports.deleteBooking = factory.deleteOne(Booking);
