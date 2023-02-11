const express = require("express");
const compression = require("compression");
const mysql = require("mysql");
const expressUpload = require("express-fileupload");
const { excuteSQL, initDB } = require("./helpers/database");
const logger = require("./helpers/logger");
const { setUser, loginRequired } = require("./helpers/middlewares");
const authRoute = require("./routes/authRoute");
const paymentsRoute = require("./routes/paymentsRoute");
const usersRoute = require("./routes/usersRoute");
const productsRoute = require("./routes/productsRoute");
const ordersRoute = require("./routes/ordersRoute");
const { uploadImage } = require("./controllers/servicesController");
const cors = require("cors");

require("dotenv").config();
const app = express();
app.use(setUser);
app.use(compression());
app.use(
  cors({
    origin: "*",
  })
);
// ignore validating json incase the webhook received request
app.use((req, res, next) => {
  if (req.originalUrl === "/payments/stripe/webhook") {
    next();
  } else {
    express.json()(req, res, next);
  }
});

app.use("/uploads", express.static(__dirname + "/uploads"));
app.use("/auth", authRoute);
app.use("/payments", paymentsRoute);
app.use("/users", usersRoute);
app.use("/products", productsRoute);
app.use("/orders", ordersRoute);

app
  .route("/uploads/upload")
  .post(loginRequired, expressUpload({ createParentPath: true }), uploadImage)
  .all((_, res) => res.sendStatus(403));
initDB(async (error) => {
  if (error) {
    logger.debug(`failed to connect to db due to ${error}`);
    return logger.error("Failed to establish database connection");
  }
  app.listen(process.env.PORT || 6000, () => {
    logger.info(`server running on port ${process.env.PORT || 6000}`);
  });
});
