const jsonwebtoken = require("jsonwebtoken");
const { excuteSQL } = require("./database");
require("dotenv").config();
const setUser = (req, res, next) => {
  if (req.headers && req.headers.authorization) {
    jsonwebtoken.verify(
      req.headers.authorization,
      process.env.AUTH_KEY || "password",
      function (err, decode) {
        if (err) {
          req.user = undefined;
          if (err.message == "jwt expired") {
            req.sessionExpired = true;
          }
        }
        const setRoleQuery = `SELECT role FROM USERS WHERE email_address=\"${decode?.email}\"`;
        excuteSQL(setRoleQuery, (err, role) => {
          if (err) {
            req.user = undefined;
            return;
          }
          if (role.length != 0) {
            req.role = role[0].role;
            req.user = decode;
          }
          next();
        });
      }
    );
  } else {
    req.user = undefined;
    next();
  }
};
const loginRequired = (req, res, next) => {
  if (req.user) {
    next();
  } else if (req.sessionExpired) {
    return res
      .status(440)
      .json({ error: "SESSION TIMED OUT", code: "session_expired" });
  } else {
    return res
      .status(401)
      .json({ error: "unauthorized user", code: "user_not_auth" });
  }
};

const isAdmin = (req, res, next) => {
  if (req.role.toLowerCase() == "admin") return next();
  return res
    .status(401)
    .send({ error: "insufficient privilege", code: "privilege_error" });
};
module.exports = {
  setUser,
  loginRequired,
  isAdmin,
};
