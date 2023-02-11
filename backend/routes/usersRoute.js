const {
  viewUsers,
  viewUser,
  deleteUser,
  updateUser,
  updateProfile,
  addUser,
  viewCurrentUser,
} = require("../controllers/usersController");
const { isAdmin, loginRequired } = require("../helpers/middlewares");

const router = require("express").Router();

router
  .route("/all")
  .get(isAdmin, viewUsers)
  .all((_, res) => res.sendStatus(405));

router
  .route("/my")
  .get(loginRequired, viewCurrentUser)
  .all((_, res) => res.sendStatus(405));

//add-user
router
  .route("/new")
  .post(loginRequired, isAdmin, addUser)
  .all((_, res) => res.sendStatus(405));

router
  .route("/:user")
  //my-profile
  .get(loginRequired, viewUser)
  //update-profile
  .post(loginRequired, updateProfile)
  //update-user
  .put(loginRequired, isAdmin, updateUser)
  //delete-user
  .delete(loginRequired, isAdmin, deleteUser)
  .all((_, res) => res.sendStatus(405));

module.exports = router;
