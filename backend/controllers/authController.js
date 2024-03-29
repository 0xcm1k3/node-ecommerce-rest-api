const { excuteSQL } = require("../helpers/database");
const SQLescape = require("sqlstring");

const { hashThis, compareHash } = require("../helpers/encryption");
const jwt = require("jsonwebtoken");
const validator = require("../helpers/validation");
const logger = require("../helpers/logger");
// sign_up
const sign_up = (req, res) => {
  if (
    !req.body.full_name ||
    !req.body.password ||
    !req.body.confirm_password ||
    !req.body.email_address
  )
    return res
      .status(400)
      .send({ error: "missing params", error_code: "missing_params" });

  if (req.body.password != req.body.confirm_password)
    return res.status(400).send({
      error: "passwords doesnt match",
      error_code: "passwords_doesnt_match",
    });
  if (req.body.password.length < 6)
    return res.status(400).send({
      error: "please enter a strong password, at least 6 chars",
      error_code: "weak_password",
    });
  var validname = req.body.full_name
    .split(" ")
    .map((name) => (validator.isString(name) ? name : ""))
    .join(" ");

  if (validname == "")
    return res.status(400).send({
      error: "please enter a valid name",
      error_code: "invalid_name",
    });
  if (!validator.isEmail(req.body.email_address))
    return res.status(400).send({
      error: "please enter a valid email address",
      error_code: "invalid_email_address",
    });

  const signupQuery = `INSERT INTO USERS (full_name, email_address, password, role) VALUES (${SQLescape.escape(
    validname
  )}, ${SQLescape.escape(req.body.email_address)}, ${SQLescape.escape(
    hashThis(req.body.password)
  )}, \"${req.body.isMerchant ? "MERCHANT" : "CLIENT"}\");`;
  excuteSQL(signupQuery, (err, result) => {
    if (err) {
      if (err.code == "ER_DUP_ENTRY")
        return res.status(400).send({
          error: "email address is already in use",
          error_code: "invalid_email_address",
        });
      logger.error(err.error);
      return res.status(403).send({
        error: "unhandled error, please contact the admin",
        code: "unexpected_error",
      });
    }
    return res.send({ message: "success" });
  });
};
//sign_in
const sign_in = (req, res) => {
  if (!req.body.email_address || !req.body.password)
    return res
      .status(400)
      .send({ error: "missing params", error_code: "missing_params" });

  const checkifUserExist = `SELECT ID,email_address,password FROM USERS WHERE email_address=${SQLescape.escape(
    req.body.email_address
  )} LIMIT 1`;

  excuteSQL(checkifUserExist, (err, results) => {
    if (err) {
      logger.error(err);
      return res.status(400).send({
        error: "unhandled error, please contact the admin",
        code: "unexpected_error",
      });
    }

    if (results.length == 0) {
      logger.info("user_not_found");
      return res.status(401).send({
        error: "invalid password or username",
        code: "invalid_credentials",
      });
    }
    const isCorrectPwd = compareHash(
      results[0].password,
      `${req.body.password}${process.env.AUTH_KEY || "password"}`
    );
    if (!isCorrectPwd) {
      logger.info("invalid_pwd");
      return res.status(401).send({
        error: "invalid password or username",
        code: "invalid_credentials",
      });
    }
    const token = jwt.sign(
      {
        uid: results.at(-1).ID,
        email: results.at(-1).email_address,
        createdAT: Date.now(),
      },
      process.env.AUTH_KEY ?? "password",
      { expiresIn: "24h" }
    );
    return res.send({ message: "success", token: token });
  });
};

module.exports = {
  sign_up,
  sign_in,
};
