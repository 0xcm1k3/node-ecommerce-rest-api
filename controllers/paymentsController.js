const { excuteSQL } = require("../helpers/database");
const logger = require("../helpers/logger");
const validator = require("../helpers/validation");
const stripe = require("stripe")(process.env.STRIPE_API_KEY);
const paypal = require("@paypal/checkout-server-sdk");
const SQLescape = require("sqlstring");

let environment = new paypal.core.SandboxEnvironment(
  process.env.PAYPAL_CLIENT_ID,
  process.env.PAYPAL_CLIENT_SECRET
);
let client = new paypal.core.PayPalHttpClient(environment);

require("dotenv").config();

// STRIPE GATEWAY
_createStripePaymentUser = async (email) => {
  try {
    if (!validator.isEmail(email)) {
      return undefined;
    }
    const customer = await stripe.customers.create({
      email: email,
    });
    const { id } = customer;
    return id;
  } catch (e) {
    logger.debug(e.message ?? error);
    return undefined;
  }
};
createStripeNewPayment = async (req, res) => {
  if (typeof req.body?.items != "object" || req.body?.items.length == 0) {
    return res
      .status(400)
      .send({ error: "invalid items value", code: "invalid_items_amount" });
  }
  try {
    const userQuery = `SELECT email_address,stripe_id from USERS WHERE ID=\"${SQLescape.escape(
      req.user.uid
    )}\" LIMIT 1`;
    const getProducts = `SELECT id,name,price FROM products WHERE ID=${[
      ...req.body.items.map((v, i) =>
        i == 0
          ? SQLescape.escape(v.prodcut_id)
          : `OR ID=${SQLescape.escape(v.prodcut_id)}`
      ),
    ].join(" ")}`;
    excuteSQL(getProducts, async (err, products) => {
      _createSession = async (customerID) => {
        const session = await stripe.checkout.sessions.create({
          mode: "payment",
          payment_method_types: ["card"],
          expires_at: Math.floor(new Date().getTime() / 1000 + 3600),
          customer: customerID ?? "",
          line_items: [
            ...products.map((p) => ({
              price_data: {
                currency: "EUR",
                unit_amount: Math.ceil(p.price * 100),
                product_data: {
                  name: p.name,
                  // product_id: p.id,
                },
              },
              quantity: req.body.items.find((v) => v.prodcut_id == p.id)?.qty,
            })),
          ],
          discounts: [],
          success_url: `${
            process.env.SERVER_ADDR ?? ""
          }/payments/success-payment`,
          cancel_url: `${
            process.env.SERVER_ADDR ?? ""
          }/payments/canceled-payment`,
        });
        const newOrderQuery = `INSERT INTO ORDERS (owner,total,status,payment_method,transction_id) VALUES (${SQLescape.escape(
          req.user.email
        )},${SQLescape.escape(
          itemsTotal
        )},'PENDING','STRIPE',${SQLescape.escape(session.id)})`;
        const getProducts = `SELECT id,name,price,owner FROM products WHERE ID=${[
          ...req.body.items.map((v, i) =>
            i == 0
              ? SQLescape.escape(v.prodcut_id)
              : `OR ID=${SQLescape.escape(v.prodcut_id)}`
          ),
        ].join(" ")}`;
        excuteSQL(newOrderQuery, (err, order) => {
          if (err) {
            logger.error(err.error);
            return;
          }
          excuteSQL(getProducts, (err, products) => {
            if (products?.length != 0) {
              products.forEach((p) => {
                excuteSQL(
                  `INSERT INTO ORDERS_ITEMS (product_id,merchant,qty,order_id) VALUES (${SQLescape.escape(
                    p.id
                  )}, ${SQLescape.escape(p.owner)} , ${SQLescape.escape(
                    req.body.items.find((v) => v.prodcut_id == p.id)?.qty
                  )},${SQLescape.escape(order.insertId)})`,
                  () => {}
                );
              });
            }
          });
        });
        const { url } = session;
        return url;
      };
      if (err) {
        logger.error(err.error);
        return res.status(400).send({
          error: "unhandled error, please contact the admin",
          code: "unexpected_error",
        });
      }
      if (products.length == 0) {
        return res.send({
          error: "no products found!",
          code: "invalid_product_ids",
        });
      }
      const itemsTotal = products
        .map(
          (p) => p.price * req.body.items.find((v) => v.prodcut_id == p.id)?.qty
        )
        .reduce((prev, next) => (prev += next));
      excuteSQL(userQuery, async (err, results) => {
        if (err) {
          logger.error(err.error);
          return res.status(400).send({
            error: "unhandled error, please contact the admin",
            code: "unexpected_error",
          });
        }
        if (results[0]?.stripe_id == null || !results[0]?.stripe_id) {
          logger.debug(
            `creating STRIPE customer ID for user => ${req.user.email}`
          );
          _createStripePaymentUser(req.user.email).then(async (customerID) => {
            if (!customerID)
              return res.status(400).send({
                error:
                  "Could not initiate a new payment , try again later or contact the admin!",
              });
            const _setUserStripeIDQuery = `UPDATE USERS SET stripe_id=${SQLescape.escape(
              customerID
            )} WHERE email_address=${SQLescape.escape(req.user.email)}`;
            excuteSQL(_setUserStripeIDQuery, async (err, results) => {
              if (err) {
                logger.error(err.error);
                return res.status(400).send({
                  error: "unhandled error, please contact the admin",
                  code: "unexpected_error",
                });
              }
              let url = await _createSession(customerID);
              return res.send({
                checkout_url: url,
              });
            });
          });
          return;
        }
        logger.debug(
          `user already has STRIPE customer ID => ${req.user.email}`
        );
        let url = await _createSession(results[0]?.stripe_id);
        if (!url) {
          logger.debug("stripe session URL was not returned!");
          return res.status(400).send({
            error: "unhandled error, please contact the admin",
            code: "unexpected_error",
          });
        }
        return res.send({
          checkout_url: url,
        });
      });
    });
  } catch (e) {
    return res.status(400).send({ error: e.message });
  }
};
handleStripePayment = async (req, res) => {
  let data;
  let eventType;
  // Check if webhook signing is configured.
  const webhookSecret = process.env.STRIPE_WEBHOOK_SIGNATURE;
  if (webhookSecret) {
    // Retrieve the event by verifying the signature using the raw body and secret.
    let event;
    let signature = req.headers["stripe-signature"];
    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        signature,
        webhookSecret
      );
    } catch (err) {
      logger.debug(err);
      logger.error("Webhook signature verification failed.");
      return res.sendStatus(400);
    }
    // Extract the object from the event.
    data = event.data;
    eventType = event.type;
  } else {
    data = req.body.data;
    eventType = req.body.type;
  }
  // const userQuery = `SELECT email_address,stripe_id FROM USERS WHERE stripe_id=${SQLescape.escape(
  data.object.customer;
  // )} LIMIT 1`;
  const orderQuery = `SELECT status,transction_id FROM ORDERS WHERE transction_id=${SQLescape.escape(
    data.object.id
  )} LIMIT 1`;
  switch (eventType) {
    case "checkout.session.completed":
      // excuteSQL(userQuery, (err, results) => {
      //   if (err) return logger.error(err.error);
      //   if (results.length == 0)
      //     return logger.error(
      //       `no user found with this stripe ID ${data.object.customer}`
      //     );
      // });
      // const newOrderQuery = `INSERT INTO ORDERS (owner, total,status,payment_method,transction_id) VALUES (${SQLescape.escape(
      //   results[0]?.email_address
      // )}, ${SQLescape.escape(
      //   data.object.amount_total / 100
      // )}, \"PAID\", \"STRIPE\",${SQLescape.escape(
      //   data.object.id || "N/A"
      // )})`;
      excuteSQL(
        `UPDATE ORDERS SET status='PAID' WHERE transction_id=${SQLescape.escape(
          data.object.id
        )}`,
        (err, _) => {
          if (err) return logger.error(err.error);
          // DO SMTH WHEN ORDER IS SUCCEED
          logger.info(`YAAAAY! new order`);
        }
      );
      break;
    case "checkout.session.expired":
      // incase order failed/expired
      // excuteSQL(userQuery, (err, results) => {
      //   if (err) return logger.error(err.error);
      //   if (results.length == 0)
      //     return logger.error(
      //       `no user found with this stripe ID ${data.object.customer}`
      //     );

      // const newOrderQuery = `INSERT INTO ORDERS (owner, total,status,payment_method) VALUES (${SQLescape.escape(
      //   results[0]?.email_address
      // )}, ${SQLescape.escape(
      //   data.object.amount_total / 100
      // )}, \"CANCELED\", \"STRIPE\")`;

      excuteSQL(
        `UPDATE ORDERS SET status='CANCELED' WHERE transction_id=${SQLescape.escape(
          data.object.id
        )}`,
        (err, _) => {
          if (err) return logger.error(err.error);
          logger.info(`Opps! customer failed to complete order!`);
        }
      );
      // });
      break;
    default:
  }
  res.sendStatus(200);
};
// PAYPAL GATEWAY
createPayPalNewPayment = async (req, res) => {
  if (typeof req.body?.items != "object" || req.body?.items.length == 0) {
    return res
      .status(400)
      .send({ error: "invalid items value", code: "invalid_items_amount" });
  }
  const getProducts = `SELECT id,name,price,owner FROM products WHERE ID=${[
    ...req.body.items.map((v, i) =>
      i == 0
        ? SQLescape.escape(v.prodcut_id)
        : `OR ID=${SQLescape.escape(v.prodcut_id)}`
    ),
  ].join(" ")}`;

  excuteSQL(getProducts, async (err, products) => {
    if (err) {
      logger.error(err.error);
      return res.status(400).send({
        error: "unhandled error, please contact the admin",
        code: "unexpected_error",
      });
    }
    if (products.length == 0) {
      return res.send({
        error: "no products found!",
        code: "invalid_product_ids",
      });
    }
    const itemsTotal = products
      .map(
        (p) => p.price * req.body.items.find((v) => v.prodcut_id == p.id)?.qty
      )
      .reduce((prev, next) => (prev += next));
    const orderBody = {
      intent: "CAPTURE",
      application_context: {
        return_url: process.env.SERVER_ADDR + "/payments/paypal/return",
        cancel_url:
          process.env.SERVER_ADDR + "/payments/paypal/return?cancel=true",
        user_action: "CONTINUE",
      },
      purchase_units: [
        {
          amount: {
            currency_code: "USD",
            value: itemsTotal,
            breakdown: {
              item_total: {
                currency_code: "USD",
                value: itemsTotal,
              },
            },
          },
          items: [
            ...products.map((p) => ({
              name: p.name,
              unit_amount: {
                currency_code: "USD",
                value: parseInt(p.price),
              },
              quantity: req.body.items.find((v) => v.prodcut_id == p.id)?.qty,
            })),
          ],
        },
      ],
    };
    try {
      let request = new paypal.orders.OrdersCreateRequest();
      request.requestBody(orderBody);
      let response = await client.execute(request);
      const newOrderQuery = `INSERT INTO ORDERS (owner,total,status,payment_method,transction_id) VALUES (${SQLescape.escape(
        req.user.email
      )},${SQLescape.escape(itemsTotal)},'PENDING','PAYPAL',${SQLescape.escape(
        response.result.id
      )})`;

      excuteSQL(newOrderQuery, (err, results) => {
        if (err) {
          logger.error(err.error);
          return res.status(400).send({
            error: "unhandled error, please contact the admin",
            code: "unexpected_error",
          });
        }
        products.forEach((p) => {
          excuteSQL(
            `INSERT INTO ORDERS_ITEMS (product_id,merchant,qty,order_id) VALUES (${SQLescape.escape(
              p.id
            )}, ${SQLescape.escape(p.owner)} , ${SQLescape.escape(
              req.body.items.find((v) => v.prodcut_id == p.id)?.qty
            )},${SQLescape.escape(results.insertId)})`,
            (err, rr) => {
              if (err) logger.error(err.error);
            }
          );
        });
        return res.send({
          checkout_url: response.result.links.find(
            (link) => link.rel === "approve"
          ).href,
        });
      });
    } catch (e) {
      logger.error(e.message);
      return res.status(400).send({
        error: "unhandled error, please contact the admin",
        code: "unexpected_error",
      });
    }
  });
};

const handlePayPalPayment = async (req, res) => {
  const orderQuery = `SELECT status,transction_id FROM ORDERS WHERE transction_id=${SQLescape.escape(
    req.query.token
  )} LIMIT 1`;
  if (req.query.cancel && req.query.cancel?.toLowerCase() == "true") {
    excuteSQL(orderQuery, (err, results) => {
      if (err) {
        logger.error(err.error);
        return res.status(400).send({
          error: "unhandled error, please contact the admin",
          code: "unexpected_error",
        });
      }
      if (results.length != 0 && results[0]?.status == "PENDING") {
        excuteSQL(
          `UPDATE ORDERS SET status='CANCELED' WHERE transction_id=${SQLescape.escape(
            req.query.token
          )}`,
          (err, order) => {
            if (err) {
              logger.error(err.error);
              return res.status(400).send({
                error: "unhandled error, please contact the admin",
                code: "unexpected_error",
              });
            }
          }
        );
      }
    });
    logger.info(`${req.query.token} was cancled successfully!`);
    return res.send({ message: "success" });
  }
  if (!req.query.token || !req.query.PayerID) return res.sendStatus(400);
  request = new paypal.orders.OrdersCaptureRequest(`${req.query.token}`);
  request.requestBody({});
  try {
    let response = await client.execute(request);
    excuteSQL(orderQuery, (err, results) => {
      if (err) {
        logger.error(err.error);
        return res.status(400).send({
          error: "unhandled error, please contact the admin",
          code: "unexpected_error",
        });
      }
      if (results.length != 0) {
        excuteSQL(
          `UPDATE ORDERS SET status='PAID' WHERE transction_id=${SQLescape.escape(
            req.query.token
          )}`,
          (err, order) => {
            if (err) {
              logger.error(err.error);
              return res.status(400).send({
                error: "unhandled error, please contact the admin",
                code: "unexpected_error",
              });
            }
            return res.status({ message: "success" });
          }
        );
      }
    });
    logger.info(`${req.query.token} was PAID successfully!`);
    return res.send({ message: "success" });
  } catch (e) {
    logger.error(e?.message ?? e);
    return res.status(400).send({ error: e.message ?? e });
  }
};
module.exports = {
  createStripeNewPayment,
  handleStripePayment,
  createPayPalNewPayment,
  handlePayPalPayment,
};
