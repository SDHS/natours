const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config({ path: './config.env' });
// to link our config file with our application. This will basically read the variables defined in our config file and save them as the node environment variables.

// we need to configure the environment variables before we require app.js

process.on('uncaughtException', (error) => {
  console.log('UNCAUGHT EXCEPTION!');
  console.log(error.name, error.message);
  process.exit(1);
});

const app = require('./app');

// console.log(app.get('env')); // to get the environment that we're currently in.
// console.log(process.env); // contains the different environment variables.
const DB = process.env.DATABASE.replace(
  '<PASSWORD>',
  process.env.DATABASE_PASSWORD
);

mongoose
  .connect(DB, {
    useNewUrlParser: true,
    useCreateIndex: true,
    useFindAndModify: false,
    useUnifiedTopology: true,
    // we need to pass in this object to deal with some deprecation warnings. mongoose.connect() returns a promise, so we can use then() and catch().
  })
  .then(() => console.log('DB connection successful!'));

// 4: START SERVER
const port = process.env.PORT;
const server = app.listen(port, () => {
  console.log(`App running on port ${port}...`);
});

process.on('unhandledRejection', (error) => {
  console.log('error due to unhandled rejection', error.name, error.message);
  console.log('UNHANDLED EXCEPTION! SHUTTING DOWN...');
  server.close(() => {
    process.exit(1);
  });
  // 0 for success, 1 for uncaught expection
  // however, process.exit() is not a good way to exit out of our program, as it abruptly shuts down everything. We need to shut down gracefully. First we exit the server, then the application.
});
