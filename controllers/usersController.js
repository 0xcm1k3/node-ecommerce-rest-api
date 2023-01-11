const { excuteSQL } = require("../helpers/database");
const { hashThis } = require("../helpers/encryption");
const logger = require("../helpers/logger");
const validator = require("../helpers/validation");

const SQLescape = require("sqlstring");
//add-user
const addUser = (req, res) => {
  if (
    !req.body.full_name ||
    !req.body.password ||
    !req.body.confirm_password ||
    !req.body.email_address ||
    !req.body.role
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
  if (!["ADMIN", "CLIENT", "MERCHANT"].includes(req.body.role.toUpperCase()))
    return res.status(400).send({
      error: "invalid role",
      code: "invalid_role",
    });
  const newUserQuery = `INSERT INTO USERS (full_name, email_address, password, role) VALUES (${SQLescape.escape(
    validname
  )}, ${SQLescape.escape(req.body.email_address)}, ${SQLescape.escape(
    hashThis(req.body.password)
  )}, ${!req.body.role ? "CLIENT" : SQLescape.escape(req.body.role)});`;
  excuteSQL(newUserQuery, (err, result) => {
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
//view-users
const viewUsers = (req, res) => {
  let page = 1;
  let limit = 1;
  if (parseInt(req.query.page) || parseInt(req.query.page) > 0) {
    page = Math.ceil(parseInt(req.query.page));
  }
  if (parseInt(req.query.limit) || parseInt(req.query.limit) > 0) {
    limit = Math.ceil(parseInt(req.query.limit));
  }

  let offset = (page - 1) * limit;

  const viewUsersQuery = `SELECT full_name, email_address, stripe_id, role, registeredAt, lastSeenAt FROM USERS ORDER BY registeredAt LIMIT ${limit} OFFSET ${offset}`;

  excuteSQL(
    `SELECT COUNT(*) as total FROM USERS;` + viewUsersQuery,
    (err, users) => {
      if (err) {
        logger.error(err.error);
        return res.send(403);
      }
      const total = users[0].at(-1).total;
      if (total <= 0)
        return res.send({ error: "no users to show", code: "no_users" });
      if (page > Math.ceil(total / limit))
        return res.status(400).send({
          error: `invalid page number (max pages:${Math.ceil(total / limit)})`,
          code: "invalid_page",
        });
      return res.send({
        message: `page ${page} out of ${Math.ceil(total / limit)}`,
        users: users.at(-1),
      });
    }
  );
};
//add-user

//update-user
const updateUser = (req, res) => {
  if (!req.params.user)
    return res
      .status(400)
      .send({ error: "invalid request", code: "invalid_request" });
  if (
    req.user.uid != parseInt(req.params.user) &&
    req.role?.toLowerCase() != "admin"
  )
    return res
      .status(401)
      .send({ error: "insufficient privilege", code: "privilege_error" });
  if (
    req.user.uid == parseInt(req.params.user) &&
    req.query?.force?.toLowerCase() != "true"
  )
    return res.status(400).send({
      error:
        "you are about to update your admin account please set param 'force' to be true in order to complete this action",
      code: "update_admin",
    });
  const { full_name, email_address, password, confirm_password, role } =
    req.body;
  const updateBody = {};
  const validName = full_name
    .split(" ")
    .map((name) => (validator.isString(name) ? name : ""))
    .join(" ");
  if (full_name)
    updateBody.full_name = validName.length <= 0 ? "NaN" : validName;

  if (email_address) {
    if (!validator.isEmail(email_address))
      return res.status(400).send({
        error: "please enter a valid email address",
        error_code: "invalid_email_address",
      });

    updateBody.email_address = email_address;
  }
  if (role) {
    if (!["ADMIN", "CLIENT", "MERCHANT"].includes(role?.toUpperCase()))
      return res.status(400).send({
        error: "invalid role",
        code: "invalid_role",
      });
    updateBody.role = role;
  }
  //   for ([key, value] of Object.entries(updateBody)) {
  //     if (!value)
  //       return res
  //         .status(400)
  //         .send({ error: `missing ${key}`, code: "missing_param" });
  //   }
  if (password) {
    if (password != confirm_password)
      return res.status(400).send({
        error: "passwords doesnt match",
        error_code: "passwords_doesnt_match",
      });
    if (password < 6)
      return res.status(400).send({
        error: "please enter a strong password, at least 6 chars",
        error_code: "weak_password",
      });

    updateBody.password = hashThis(password);
  }

  const updateUserQuery = `UPDATE USERS SET ${Object.entries(updateBody)
    .map(([key, value]) =>
      key != "confirm_password" ? `${key}=${SQLescape.escape(value)}` : ""
    )
    .join(",")} WHERE ID=${parseInt(req.params.user)} LIMIT 1`;
  excuteSQL(updateUserQuery, (err, result) => {
    if (err) {
      console.log(err["code"]);
      if (err.code == "ER_DUP_ENTRY")
        return res.status(400).send({
          error: "email address is already in use",
          error_code: "invalid_email_address",
        });
      logger.error(err);
      return res.status(403).send({
        error: "unhandled error, please contact the admin",
        code: "unexpected_error",
      });
    }
    if (result?.affectedRows == 0) {
      return res.status(404).send({
        error: `user with id ${parseInt(req.params.user)} was not found`,
        code: "user_not_found",
      });
    }

    if (updateBody.email_address) {
      // TODO : IF USER EMAIL IS BEING UPDATED SET EMAIL CONFIRMED TO BE FALSE
      //AND  RE SEND CONFIRMATION EMAIL
      logger.debug("RE CONFIRM EMAIL!");
    }
    return res.send({ message: "success" });
  });
};
//delete-user
const deleteUser = (req, res) => {
  if (!req.params.user)
    return res
      .status(400)
      .send({ error: "invalid request", code: "invalid_request" });
  if (req.role?.toLowerCase() != "admin")
    return res.send({
      error: "insufficient privilege",
      code: "privilege_error",
    });
  if (
    req.user.uid == parseInt(req.params.user) &&
    req.query?.force?.toLowerCase() != "true"
  )
    return res.status(400).send({
      error:
        "you are about to delete your admin account please set param 'force' to be true in order to complete this action",
      code: "kill_admin",
    });
  const UserQuery = `DELETE FROM USERS WHERE ID=${SQLescape.escape(
    req.params.user
  )} LIMIT 1`;
  excuteSQL(UserQuery, (err, result) => {
    if (err) {
      logger.error(err);
      return res
        .status(400)
        .send({ error: "invalid request", code: "invalid_request" });
    }
    if (result.affectedRows == 0)
      return res.status(404).send({
        error: `user with id ${parseInt(req.params.user)} was not found`,
        code: "user_not_found",
      });
    return res.send({ message: "success" });
  });
};
//my-profile
const viewUser = (req, res) => {
  if (!req.params.user)
    return res
      .status(400)
      .send({ error: "invalid request", code: "invalid_request" });
  if (
    req.user.uid != parseInt(req.params.user) &&
    req.role?.toLowerCase() != "admin"
  )
    return res
      .status(401)
      .send({ error: "insufficient privilege", code: "privilege_error" });
  const getUserQuery = `SELECT ID,full_name, email_address,lastSeenAt,registeredAt,role,stripe_id FROM USERS WHERE ID=${SQLescape.escape(
    req.params.user
  )} LIMIT 1`;
  excuteSQL(getUserQuery, (err, user) => {
    if (err) {
      logger.error(err);
      return res
        .status(400)
        .send({ error: "invalid request", code: "invalid_request" });
    }
    if (user.length == 0)
      return res.status(404).send({
        error: `user with id ${parseInt(req.params.user)} was not found`,
        code: "user_not_found",
      });

    const { full_name, email_address, lastSeenAt, registeredAt, role } =
      user.at(-1);
    if (req.role.toLowerCase() == "admin") return res.send(user.at(-1));
    return res.send({
      full_name,
      email_address,
      lastSeenAt,
      registeredAt,
      type: role,
    });
  });
};
//update-profile
const updateProfile = (req, res) => {
  if (!req.params.user)
    return res
      .status(400)
      .send({ error: "invalid request", code: "invalid_request" });
  if (
    req.user.uid != parseInt(req.params.user) &&
    req.role?.toLowerCase() != "admin"
  )
    return res
      .status(401)
      .send({ error: "insufficient privilege", code: "privilege_error" });

  const { full_name, email_address, password, confirm_password } = req.body;
  const updateBody = {};
  const validName = full_name
    .split(" ")
    .map((name) => (validator.isString(name) ? name : ""))
    .join(" ");
  if (full_name)
    updateBody.full_name = validName.length <= 0 ? "NaN" : validName;

  if (email_address) {
    if (!validator.isEmail(email_address))
      return res.status(400).send({
        error: "please enter a valid email address",
        error_code: "invalid_email_address",
      });

    updateBody.email_address = email_address;
  }
  if (password) {
    if (password != confirm_password)
      return res.status(400).send({
        error: "passwords doesnt match",
        error_code: "passwords_doesnt_match",
      });
    if (password < 6)
      return res.status(400).send({
        error: "please enter a strong password, at least 6 chars",
        error_code: "weak_password",
      });

    updateBody.password = hashThis(password);
  }

  const updateUserQuery = `UPDATE USERS SET ${Object.entries(updateBody)
    .map(([key, value]) =>
      key != "confirm_password" ? `${key}=${SQLescape.escape(value)}` : ""
    )
    .join(",")} WHERE ID=${SQLescape.escape(req.params.user)} LIMIT 1`;
  excuteSQL(updateUserQuery, (err, result) => {
    if (err) {
      console.log(err["code"]);
      if (err.code == "ER_DUP_ENTRY")
        return res.status(400).send({
          error: "email address is already in use",
          error_code: "invalid_email_address",
        });
      logger.error(err);
      return res.status(403).send({
        error: "unhandled error, please contact the admin",
        code: "unexpected_error",
      });
    }
    if (result?.affectedRows == 0) {
      logger.error(err.error);
      return res.status(403).send({
        error: "unhandled error, please contact the admin",
        code: "unexpected_error",
      });
    }

    if (updateBody.email_address) {
      // TODO : IF USER EMAIL IS BEING UPDATED SET EMAIL CONFIRMED TO BE FALSE
      //AND  RE SEND CONFIRMATION EMAIL
      logger.debug("RE CONFIRM EMAIL!");
    }
    return res.send({ message: "success" });
  });
};
module.exports = {
  viewUsers,
  viewUser,
  updateUser,
  updateProfile,
  deleteUser,
  addUser,
};
