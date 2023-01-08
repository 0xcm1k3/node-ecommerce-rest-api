const {
  viewUsers,
  viewUser,
  deleteUser,
  updateUser,
} = require("../controllers/usersController");
const { isAdmin, loginRequired } = require("../helpers/middlewares");

const router = require("express").Router();

router
  .route("/all")
  .get(isAdmin, viewUsers)
  .all((req, res) => res.sendStatus(405));

//add-user
router.route("/new").all((req, res) => res.sendStatus(405));

router
  .route("/:user/")
  //my-profile
  .get(loginRequired, viewUser)
  //update-profile
  .post(loginRequired, (req, res) => res.send({ ok }))
  //update-user
  .put(loginRequired, isAdmin, updateUser)
  //delete-user
  .delete(loginRequired, isAdmin, deleteUser)
  .all((req, res) => res.sendStatus(405));

module.exports = router;
