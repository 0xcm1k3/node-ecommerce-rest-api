const express = require("express");
const compression = require("compression");
const mysql = require("mysql");
const { excuteSQL, initDB } = require("./helpers/database");
const logger = require("./helpers/logger");
const { setUser } = require("./helpers/middlewares");
const authRoute = require("./routes/authRoute");
const paymentsRoute = require("./routes/paymentsRoute");
const usersRoute = require("./routes/usersRoute");
const productsRoute = require("./routes/productsRoute");
require("dotenv").config();
const app = express();
app.use(setUser);
app.use(compression());
// ignore validating json incase the webhook received request
app.use((req, res, next) => {
  if (req.originalUrl === "/payments/stripe/webhook") {
    next();
  } else {
    express.json()(req, res, next);
  }
});

app.use("/auth", authRoute);
app.use("/payments", paymentsRoute);
app.use("/users", usersRoute);
app.use("/products", productsRoute);
initDB(async (error) => {
  if (error) {
    logger.debug(`failed to connect to db due to ${error}`);
    return logger.error("Failed to establish database connection");
  }
  app.listen(process.env.PORT || 6000, () => {
    logger.info(`server running on port ${process.env.PORT || 6000}`);
  });
});
