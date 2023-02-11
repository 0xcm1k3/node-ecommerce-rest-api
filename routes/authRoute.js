const router = require("express").Router();

const { sign_in, sign_up } = require("../controllers/authController");
const { loginRequired } = require("../helpers/middlewares");

router.route("/").all((_, res) => res.sendStatus(405));

router
  .route("/token")
  .get(loginRequired, (req, res) => {
    return res.send({
      message: "success",
      role:
        req.role?.toLowerCase() != "client"
          ? req.role?.toLowerCase()
          : undefined,
    });
  })
  .all((_, res) => res.sendStatus(405));
router
  .route("/register")
  .post(sign_up)
  .all((_, res) => res.sendStatus(405));
router
  .route("/login")
  .post(sign_in)
  .all((_, res) => res.sendStatus(405));

module.exports = router;
