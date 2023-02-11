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
  .all((_, res) => res.sendStatus(405));

//view-my-products
router
  .route("/my")
  .get(loginRequired, viewMyProducts)
  .all((_, res) => res.sendStatus(405));

//add-product
router
  .route("/new")
  .post(loginRequired, addProduct)
  .all((_, res) => res.sendStatus(405));

//TODO:fix error when callin anything on random endpoint /xxx instead of /product_id
router
  .route("/:product")
  //view-product
  .get(loginRequired, viewProduct)
  //update-product
  .post(loginRequired, updateProduct)
  //delete-product
  .delete(loginRequired, deleteProduct)
  .all((_, res) => res.sendStatus(405));

module.exports = router;
