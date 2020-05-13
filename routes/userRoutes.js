const express = require('express');
const userController = require('../controllers/userController');
const authController = require('../controllers/authController');

const router = express.Router();

router.route('/signup').post(authController.signup);
// Only POST is required. We cannot get data from signup, or patch it. It makes sense only to send data to this route.
// This doesn't 100% follow the REST architecture as now the name of the resource is a verb (signup), but sometimes that is the only way.
router.route('/login').post(authController.login);

router.route('/logout').get(authController.logout);

router.route('/forgotPassword').post(authController.forgotPassword);

router.route('/resetPassword/:token').patch(authController.resetPassword);

router.use(authController.protect);
// This is protect all the routes that come after this point! Because, remember, that router here is kind of like its own mini app, so we can use use() on it. Also, middlewares always run in sequence. After running the above middlewares like login() signup() (if their route is hit), the next() one in sequence will be this middleware. Since it has no specific route, so it will always run. And only after this will the middlewares below it run, provided that the protect() middleware calls the next() function. (Meaning that the constraints of protect() are satisfied)

router.route('/updateMyPassword/').patch(authController.updatePassword);

router.route('/me').get(userController.getMe, userController.getUser);

router
  .route('/updateMe')
  .patch(
    userController.uploadUserPhoto,
    userController.resizeUserPhoto,
    userController.updateMe
  );

router.route('/deleteMe').delete(userController.deleteMe);

router.use(authController.restrictTo('admin'));
// using the same middleware technique as above to restrict access to the middlewares below only to admins.

router
  .route('/')
  .get(userController.getAllUsers)
  .post(userController.createUser);

router
  .route('/:id')
  .get(userController.getUser)
  .patch(userController.updateUser)
  .delete(userController.deleteUser);

module.exports = router;
