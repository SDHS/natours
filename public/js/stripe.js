/* eslint-disable */
import axios from 'axios';
const stripe = Stripe('pk_test_GdDRf2kR41EDfz0h6qq2JixD00ZFaNUsCa');
import { showAlert } from './alerts'; 

export const bookTour = async (tourID) => {
  try {
    // 1) Get checkout session from API
    const session = await axios({
      method: 'GET',
      url: `http://127.0.0.1:3000/api/v1/bookings/checkout-session/${tourID}`
    });
    console.log(session);
    // 2) Create checkout form + charge credit card
    await stripe.redirectToCheckout({
      sessionId: session.data.session.id,
    });

  } catch (error) {
    showAlert('error', err);
  }
};
