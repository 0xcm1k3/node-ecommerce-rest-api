const {
  viewOrders,
  viewMyOrders,
  viewOrder,
} = require("../controllers/ordersController");
const { loginRequired } = require("../helpers/middlewares");

const router = require("express").Router();

//view-orders
router
  .route("/all")
  .get(loginRequired, viewOrders)
  .all((req, res) => res.sendStatus(405));

//view-my-products
router
  .route("/my")
  .get(loginRequired, viewMyOrders)
  .all((req, res) => res.sendStatus(405));

//order-details
router
  .route("/:order")
  //view-product
  .get(loginRequired, viewOrder)
  //update-product
  // .post(loginRequired, updateProduct)
  //delete-product
  // .delete(loginRequired, deleteProduct)
  .all((req, res) => res.sendStatus(405));
//update-order

//delete-order
module.exports = router;
