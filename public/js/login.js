/* eslint-disable */
import axios from 'axios';
import { showAlert } from './alerts';
export const login = async (email, password) => {
  try {
    const response = await axios({
      method: 'POST',
      url: '/api/v1/users/login',
      data: {
        email: email,
        password: password,
      },
    });

    if (response.data.status === 'success') {
      showAlert('success', 'Logged in succesfully!');
      window.setTimeout(() => {
        location.assign('/');
      }, 1);
      // Alert and then after 1 msecs, go back to the overview page.
    }
  } catch (err) {
    showAlert('error', err.response.data.message);
  }
};


export const logout = async () => {
  try {
    const response = await axios({
      method: 'GET',
      url: '/api/v1/users/logout',
    });
    if (response.data.status === 'success') {
      location.reload(true);
      // to reload the page.
      // it is set to true so that the page is reloaded from the server, and not from the cache. If it is loaded from the cache, it may simply serve up the logged in header menu again.
    }
  }
  catch (err) {
    showAlert('error', 'Error logging out! Try again!');
  }
}