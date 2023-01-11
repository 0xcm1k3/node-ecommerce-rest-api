const {
  viewMyProducts,
  viewProducts,
  addProduct,
  viewProduct,
  updateProduct,
  deleteProduct,
} = require("../controllers/productsController");
const { loginRequired } = require("../helpers/middlewares");

const router = require("express").Router();

//view-products
router
  .route("/all")
  .get(loginRequired, viewProducts)
  .all((req, res) => res.sendStatus(405));

//view-my-products
router
  .route("/my")
  .get(loginRequired, viewMyProducts)
  .all((req, res) => res.sendStatus(405));

//add-product
router
  .route("/new")
  .post(loginRequired, addProduct)
  .all((req, res) => res.sendStatus(405));

router
  .route("/:product")
  //view-product
  .get(loginRequired, viewProduct)
  //update-product
  .post(loginRequired, updateProduct)
  //delete-product
  .delete(loginRequired, deleteProduct)
  .all((req, res) => res.sendStatus(405));

module.exports = router;
