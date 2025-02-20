const stripe = require("stripe")(process.env.strip_secret_key);

// Stripe Customers
// Create New Strip Customer User
export const CreateNewStripCustomer = async ({
  email,
  name,
}: {
  email: string;
  name: string;
}) => {
  const customer = await stripe.customers.create({
    email,
    name,
    // shipping: {
    // address: {
    //     city: 'Brothers',
    //     country: 'US',
    //     line1: '27 Fredrick Ave',
    //     postal_code: '97712',
    //     state: 'CA',
    // },
    // name: '{{CUSTOMER_NAME}}',
    // },
    // address: {
    // city: 'Brothers',
    // country: 'US',
    // line1: '27 Fredrick Ave',
    // postal_code: '97712',
    // state: 'CA',
    // },
  });
  return customer;
};

// query convertable function for serach customer user
function convertQuery(obj: any) {
  const queryParts: string[] = [];
  function processObject(currentObj: { [x: string]: any }, parentKey = "") {
    Object.keys(currentObj).forEach((key) => {
      const value = currentObj[key];
      const currentKey = parentKey ? `${parentKey}[\'${key}\']` : key;

      if (typeof value === "object" && value !== null) {
        processObject(value, currentKey); // Recursively process nested objects
      } else {
        queryParts.push(`${currentKey}:'${value}'`);
      }
    });
  }
  processObject(obj);
  return queryParts.join(" AND ");
}

// Search strip customer user as per email, name, metadata etc
export const stripCustomers = async (query: any) => {
  const customer = await stripe.customers.search({
    query: convertQuery(query), //`email:\"${email}\"`,
  });
  return customer;
};

//  Create Customer if you have payment method ID
export const CreateSCWithPM = async ({
  email,
  paymentMethodId,
  name,
}: {
  email: string;
  paymentMethodId: string;
  name: string;
}) => {
  const customer = await stripe.customers.create({
    email,
    name,
    payment_method: paymentMethodId,
    invoice_settings: {
      default_payment_method: paymentMethodId,
    },
  });
  return customer;
};

// Delete Stripe Customer User
export const deleteStripCustomer = async ({
  customerId,
}: {
  customerId: string;
}) => {
  const customer = await stripe.customers.del(customerId);
  // cancelSubscription(subscriptionId)     // Cancel customer subscription if remove customer from record.
  return customer;
};


// Update Payment Method
// If the customer wants to change their payment method, use the Payment Methods API to detach the old card and attach a new one.
export const detachPaymentMethods = async(paymentMethodId:string)=> await stripe.paymentMethods.detach(paymentMethodId);

// Payment Method Attachment or Attach a new card
export const paymentMethodAttachment = async (
  paymentMethodId: string,
  customerId: string
) =>
  await stripe.paymentMethods.attach(paymentMethodId, {
    customer: customerId,
  });


// Create New Subscription for Customer
export const CreateSubscriptions = async (
  customer: { id: string },
  priceId: { priceId: string },
  paymentMethodId?: string
) => {
  const paymentMethod = paymentMethodId
    ? { default_payment_method: paymentMethodId }
    : {
        payment_behavior: "default_incomplete",
        payment_settings: { save_default_payment_method: "on_subscription" },
        expand: ["latest_invoice.payment_intent"],
      };
  // Create the subscription
  const subscription = await stripe.subscriptions.create({
    customer: customer.id,
    items: [{ price: priceId }], // Replace with your Price ID
    ...paymentMethod,
  });
  return subscription;
};

// Update Subscription Plan
export const updatedSubscription = async({subscriptionId, newSubId, priceId}:{subscriptionId: string, newSubId: string, priceId:string | number}) => await stripe.subscriptions.update(subscriptionId, {
  items: [{
    id: newSubId,
    price: priceId,
  }],
});

// Cancel Spripe Subscription
export const cancelSubscription = async (subscriptionId: string) => {
  const subscription = await stripe.subscriptions.cancelSubscription({ subscriptionId, });
  // or
  // await stripe.subscriptions.del('subscription_id');
  return subscription;
};


// Fetch all products (your subscription plans)
export const stripProducts = async () => await stripe.products.list();


// Fetch all prices associated with the products
export const stripPrices = async () => await stripe.prices.list();


// Cards Options
// Create New Card for customer
export const createCard = async ({
  customerId,
  cardDetail,
}: {
  customerId: string;
  cardDetail: any;
}) =>
  await stripe.customers.createSource(customerId, {
    // source: 'tok_visa', or
    source: {
      ...cardDetail,
      // exp_month, exp_year, number:'', // card no
      // address_city, address_country, address_line1, address_state, address_zip, currency, cvc,name:'',
      // metadata:{} // storing additional information about the card in a structured format
    },
  });

// Update Card for customer
export const updateCard = async ({
  customerId,
  cardId,
  cardDetail,
}: {
  customerId: string;
  cardId: string;
  cardDetail: any;
}) =>
  await stripe.customers.updateSource(customerId, cardId, {
    ...cardDetail,
    // exp_month, exp_year, number:'', // card no
    // address_city, address_country, address_line1, address_state, address_zip, currency, cvc,name:'',
    // metadata:{} // storing additional information about the card in a structured format
  });

// card list
// https://api.stripe.com/v1/customers/cus_NhD8HD2bY8dP3V/cards
// pass secret key

// Delete Customer Card
export const DeleteCard = async ({
  customerId,
  cardId,
}: {
  customerId: string;
  cardId: string;
}) => await stripe.customers.deleteSource(customerId, cardId);

// Payment History
export const paymentHistory = async (customerId:string, limit:number = 10) => await stripe.paymentIntents.list({
  customer: customerId,
  limit: limit,
});


// Stripe webhook
// app.post('/webhooks', express.raw({ type: 'application/json' }), (req, res) => {
//   const sig = req.headers['stripe-signature'];
//   const event = stripe.webhooks.constructEvent(req.body, sig, 'your-webhook-signing-secret');

//   if (event.type === 'invoice.payment_succeeded') {
//     const invoice = event.data.object;
//     console.log('Payment for invoice succeeded:', invoice.id);
//   }

//   res.json({ received: true });
// });