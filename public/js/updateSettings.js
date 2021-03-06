/* eslint-disable */
import axios from 'axios';
import { showAlert } from './alerts';
export const updateSettings = async (data, type) => {
  // data: object containing all the data to update.
  // type: either regular 'data' or 'password'
  const url = type === 'password' ? '/api/v1/users/updateMyPassword' : '/api/v1/users/updateMe';
  try {
    const response = await axios({
      method: 'PATCH',
      url: url,
      data: data,
    });
    if (response.data.status === 'success') {
      showAlert('success', `${type.toUpperCase()} updated succesfully!`);
    }
  } catch (error) {
    showAlert('error', error.response.data.message);

  }

};