const { excuteSQL } = require("../helpers/database");
const { hashThis } = require("../helpers/encryption");
const logger = require("../helpers/logger");

//view-users
const viewUsers = async (req, res) => {
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
      if (page > Math.ceil(total / limit))
        return res.status(400).send({
          error: `invalid page number (max pages:${Math.ceil(total / limit)})`,
          code: "invalid_page",
        });
      return res.send(users.at(-1));
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

  const {
    full_name,
    email_address,
    password,
    confirm_password,
    role,
    stripe_id,
  } = req.body;
  const updateBody = {
    full_name,
    email_address,
    role,
  };
  for ([key, value] of Object.entries(updateBody)) {
    if (!value)
      return res
        .status(400)
        .send({ error: `missing ${key}`, code: "missing_param" });
  }
  if (!["ADMIN", "CLIENT", "MERCHANT"].includes(role?.toUpperCase()))
    return res.status(400).send({
      error: "invalid role",
      code: "invalid_role",
    });
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
  const updateUserQuery = ``;
  return res.send(updateBody);
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
  const UserQuery = `DELETE FROM USERS WHERE ID=\"${parseInt(
    req.params.user
  )}\" LIMIT 1`;
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

  //TODO : PATCH SQL INJECTION in user param ( deployed temp solution which allow only int to be passed)
  const getUserQuery = `SELECT ID,full_name, email_address,lastSeenAt,registeredAt,role,stripe_id FROM USERS WHERE ID=\"${praseInt(
    req.params.user
  )}\" LIMIT 1`;
  excuteSQL(getUserQuery, (err, user) => {
    if (err) {
      logger.error(err);
      return res
        .status(400)
        .send({ error: "invalid request", code: "invalid_request" });
    }
    if (user.length != 0) {
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
    }
  });
};
//update-profile

module.exports = {
  viewUsers,
  viewUser,
  deleteUser,
  updateUser,
};
