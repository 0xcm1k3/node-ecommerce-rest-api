const {
  viewOrders,
  viewMyOrders,
  viewOrder,
  updateOrderStatus,
  deleteOrder,
} = require("../controllers/ordersController");
const { loginRequired, isAdmin } = require("../helpers/middlewares");

const router = require("express").Router();

//view-orders
router
  .route("/all")
  .get(loginRequired, viewOrders)
  .all((_, res) => res.sendStatus(405));

//view-my-products
router
  .route("/my")
  .get(loginRequired, viewMyOrders)
  .all((_, res) => res.sendStatus(405));

//order-details
router
  .route("/:order")
  //view-order
  .get(loginRequired, viewOrder)
  // update-order
  .post(loginRequired, updateOrderStatus)
  //delete-order
  .delete(loginRequired, isAdmin, deleteOrder)
  .all((_, res) => res.sendStatus(405));
module.exports = router;
