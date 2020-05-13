const path = require('path');
const express = require('express');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
// const cors = require('cors');
const cookieParser = require('cookie-parser');
const compression = require('compression');

const AppError = require('./utils/appError');
const globalErrorHandler = require('./controllers/errorController');
const tourRouter = require('./routes/tourRoutes');
const userRouter = require('./routes/userRoutes');
const reviewRouter = require('./routes/reviewRoutes');
const bookingRouter = require('./routes/bookingRoutes');
const viewRouter = require('./routes/viewRoutes');

// Start Express
const app = express();
// will add a bunch of methods to our app variable.

app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views'));

// app.get('/', (request, response) => {
//     // response.status(200).send('Hello from the server side!');
//     // to send JSON, we use the JSON() method.
//     response
//         .status(200)
//         .json({ message: 'Hello from the server side!', app: 'Natours' });
// }); // '/' is the root URL. We are implementing routing here. Then, once we are hit with a HTTP GET request on this URL, whatever we have specified in our callback function is executed.

// app.post('/', (request, response) => {
//     response.send('You can post to this endpoint...');
// });

app.use(cookieParser());

// 1: GLOBAL MIDDLEWARES
// to include middleware, a function that can modify the incoming request data
app.use(express.static(path.join(__dirname, 'public')));
// middleware that allows us to use static files like HTML, CSS, images etc by specifying the file directory path.

app.use(
  express.urlencoded({
    extended: true,
    limit: '10kb',
  })
); // to get data from a HTML form

if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
  // the argument basically specifies how we want the logging to be formatted.
}

// SET SECURITY HTTP HEADERS

// HELMET FOR SECURITY
app.use(helmet());

// RATE LIMITER!
/*
  Limit the requests coming from an IP. It adds X-RateLimit-Limit, X-RateLimit-Remaining, and X-RateLimit-Reset response headers. Basically decrements X-RateLimit-Remaining after each request, and when it is zero, displays the message specified in the rateLimit options below. The count is reset after windowMs. Also, our app CANNOT crash during this time as this will reset the timer and it will count all the way from 'max' again!
*/
const limiter = rateLimit({
  max: 100,
  // max 100 requests
  windowMs: 60 * 60 * 1000,
  // 100 requests in one hour
  message: 'Too many requests from this IP! Please try again in an hour!',
});

app.use('/api', limiter);

// Body parser, reading data from body into request.body
app.use(
  express.json({
    limit: '10kb',
    // do not accept body if it is >10kb
  })
);

// DATA SANITIZATION AGAINST NOSQL QUERY INJECTION
app.use(mongoSanitize()); // cleans the response body from any mongoDB operators

// DATA SANITIZATION AGAINST XSS (CROSS-SIDE SCRIPTING ATTACKS):
app.use(xss()); // cleans malicious HTML code, JS code

// PREVENTING PARAMETER POLLUTION
app.use(
  hpp({
    whitelist: [
      'duration',
      'ratingsQuantity',
      'ratingsAverage',
      'maxGroupSize',
      'difficulty',
      'price',
    ],
  })
);

app.use(compression());

// app.use((request, response, next) => {
//   console.log('Hello from the middleware :D');
//   next();
// });

app.use((request, response, next) => {
  request.requestTime = new Date().toISOString();
  // console.log(`COOKIE:`);
  // console.log(request.cookies);
  next();
});

//app.get('/api/v1/tours', getAllTours);
//app.get('/api/v1/tours/:id', getTour);
//app.post('/api/v1/tours', createTour);
//app.patch('/api/v1/tours/:id', updateTour);
//app.delete('/api/v1/tours/:id', deleteTour);

// 3: ROUTE

// to prevent favicon.ico requests
app.use(function (request, response, next) {
  if (
    request.originalUrl &&
    request.originalUrl.split('/').pop() === 'favicon.ico'
  ) {
    return response.sendStatus(204);
  }
  return next();
});

// using route, we can handle GET and POST at the same time, and don't have to write the same resource again and again.

// the callback function here is called the Route Handler in express.
// it is good practice to specify the version of the API so that the users who are still some previous versions, the API does not break for them.

app.use('/', viewRouter);
app.use('/api/v1/tours', tourRouter);
app.use('/api/v1/users', userRouter);
app.use('/api/v1/reviews', reviewRouter);
app.use('/api/v1/bookings', bookingRouter);
// tourRouter/userRouter is a middleware, and we want to use this middleware for the specified route. This is called 'mounting' the router.
// TO CATCH ROUTES THAT WERENT DEFINED
/*
  So, we know that middlewares are executed in the order they're defined/invoked. So, we know that if the route we're getting is NOT handled by the above two routers, this means it is a route that we haven't handled. So, we can write a router for unhandled routes AFTER the tourRouter and userRouter. Because, again, we'll only reach this point if it is a route that cannot be handled by the tourRouter and the userRouter.
*/
app.all('*', (request, response, next) => {
  // response.status(404).json({
  // status: 'fail',
  // message: `Can't find ${request.originalUrl} on this server!`,
  // originalURL is the URL that was requested;
  // });
  // const error = new Error(`Can't find ${request.originalUrl} on this server!`);
  // error.status = 'fail';
  // error.statusCode = 404;
  next(new AppError(`Can't find ${request.originalUrl} on this server!`, 404));
  // now we use next() in a different way. Whenever an argument is passed into next(), no matter what it is, Express assumes that it is an error. Then, Express will skip all the middlewares that occur next and move straight to the global error handling middleware that we have defined. (the one that has four arguments.)
});
// all method runs for all HTTP methods. POST, GET, PATCH, DELETE etc.
// * stands for everything.

app.use(globalErrorHandler);
module.exports = app;

//////////////////////////////////////////// REST ARCHITECTURE FOR APIS

/*
    REST stands for REpresentational States Transfer; a way of building APIs in a logical way, which makes them easier to consume. RESTful APIs are those which follow the REST architecture. To build RESTful APIs, we need to follow a couple of guidelines:
    1. Separate API into logical resources.
    2. Expose these above mentioned structured, resource-based URLs.
    3. To perform CRUD operations, use HTTP methods (verbs), and not the URL.
    4. Send data as JSON (usually)
    5. These RESTful APIs must be stateless.


    1 (Desc): Resource (NOUN) is an object or representation of something, which has data associated to it. Any information that can be named can be a resource. Example: tours, users, reviews.
    
    2 (Desc): Expose means make available.
    Example: https://www.natours.com/addNewTour
    In above example, the whole address is called the URL, while the forward slash and everything to its right is an API endpoint. Our API will have many different endpoints, and each will send back some different data to the client and perform different actions.

    3 (Desc): We should ONLY use HTTP methods to perform actions on our data. So, our endpoints should only contain our resources and NOT the actions that can be performed on them, because they will quickly become a nightmare to maintain.
    Example: /getTour should be GET /tours where GET is the HTTP request and tours is our resource. That is why our resource should be a NOUN and not a VERB, because our HTTP request is the one which is a VERB! Also, it is common practice to use the resource name as plural, so that's why it is tours and not tour. 
    When we hit the tours resource with a GET request, we'll get all the tours that are in a database. To access a specific one, we have to specify its id using another slash like this: tours/id OR tours/7. WE can also specify it in a search query. It can also be a name of the tour; the point is, it must be unique.
    ANOTHER EXAMPLE: /getToursByUser can be translated into REST as /users/3/tours/9 or something like that.

    4 (desc): In JSON, each key must be a string. However, its value can be numbers, strings, boolean, etc.
    We send JSON data using JSend, in which there are two fields: one is "status", that contains the status number. And the other field is "data", that contains all the data to be sent. So, the data field contains another object. This way of containing an object within another object is called 'enveloping', and it is used to mitigate some security issues and other problems.

    5 (Desc): Stateless means that all state is handled on the client. This means that each request must contain all the information necessary to process a certain request. The server should NOT have to remember previous requests. Example: Whether a client is logged in, what the current page is and so on...
    EXAMPLE: 
    /tours/nextPage
    Suppose we're on page 5, and we have to go to page 6. In order to do that, the server has to remember what the current page is and increment it by one, then send it by 1. This is not stateless.
    nextPage = currentPage + 1;
    send(nextPage)
    
    TO make it stateless, we would do something like:
    /tours/page/6
    send(6)
*/

/*
GET is used to perform read operation on the data. (Here we will send the id of the tour to be read.)
POST is used to create data. (Here we will not send any id as we are creating a new tour in our example, and the server is supposed to automatically give it a new id.)
PUT/PATCH is used to update data. With PUT, client is supposed to send the entire object. With PATCH, it is supposed to only send a part of the object that has been changed. (Here, id of the tour to be changed is sent.)
DELETE is used to delete data. (id of the tour to be deleted is to be sent.)
*/

//////////////////////////////////////////// MIDDLEWARE
/*
    Middleware is named so because it is code that is executed in the middle of receiving the request and sending the response. It is about manipulating the req and res objects, however it may also execute code that we want. In Express, we can say that EVERYTHING is middleware, even the route definitions.
    All the middleware that we used in our app is called the middleware stack. The order of middleware in the stack is actually defined by the order they are defined in the code. A middleware that appears first in the code is executed before one that appears later. 
    After we receive an incoming request,our req and res objects go through each middleware and some processing is done on them, or some code is executed, before the response is sent back to the client.
    After the execution of a middleware, a next() function is called, which is a function that we have access to in each middleware function, just like the request and response objects. When the next() function is called ,the next middleware in the stack is executed, with the same request and response object. ALl the middlewares can be thought of as a "pipeline" that our request and response objects go through.
    In the last middleeware function, we do not call the next() function. Instead, we finally send the response data (res.send()) to  the client, finishing the request-response cycle. It is just like a linear process.
    use() function is what we, well, use to add the middleware to our middleware stack.
    We can create our own middlewares too!
    We just need to pass to use() the function that we want to add to our middleware stack.
    Route handlers can also be thought of as middlewares. Middlewares that only apply for a specific route, as opposed to every route.
    Param middleware is a special type of middleware that only runs when we have a certain parameter in our URl.
*/

//////////////////////////////////////////// ENVIRONMENTS:
/*
node.js and express apps can function in different environments. Depending on that, we can accomplish different functions, e.g. turning login on or off, using different databases etc, based on the environment variables. The most important environments are the deveopment environment and the production environment.
*/
