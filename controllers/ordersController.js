const SQLescape = require("sqlstring");
const { excuteSQL } = require("../helpers/database");
const logger = require("../helpers/logger");

const viewOrders = (req, res) => {
  if (req?.role.toLowerCase() != "admin") {
    return res
      .status(401)
      .send({ error: "insufficient privilege", code: "privilege_error" });
  }
  let page = 1;
  let limit = 20;
  const filters = ["paid", "canceled", "pending", "completed", "all"];
  let filter = "all";
  if (filters.includes(req.query?.filter?.toLowerCase())) {
    filter = req.query?.filter?.toLowerCase();
  }
  if (parseInt(req.query.page) || parseInt(req.query.page) > 0) {
    page = Math.ceil(parseInt(req.query.page));
  }
  if (parseInt(req.query.limit) || parseInt(req.query.limit) > 0) {
    limit = Math.ceil(parseInt(req.query.limit));
  }

  let offset = (page - 1) * limit;
  const getOrdersQuery = `SELECT * FROM ORDERS ${
    filter != "all" ? "WHERE status=" + SQLescape.escape(filter) : ""
  } LIMIT ${limit} OFFSET ${offset}`;
  excuteSQL(
    `SELECT COUNT(*) as total FROM ORDERS;` + getOrdersQuery,
    (err, orders) => {
      if (err) {
        logger.error(err.error);
        return res.sendStatus(403);
      }
      const total = orders[0].at(-1).total;
      if (total <= 0)
        return res.send({
          error: "There is no orders listed orders to show",
          code: "no_orders",
        });
      if (page > Math.ceil(total / limit))
        return res.status(400).send({
          error: `invalid page number (max pages:${Math.ceil(total / limit)})`,
          code: "invalid_page",
        });
      return res.send({
        message: `page ${page} out of ${Math.ceil(total / limit)}`,
        orders: orders.at(-1).map((v) => {
          return {
            order_id: v.id,
            order_owner: v.owner,
            order_total: v.total,
            order_status: v.status,
            order_transction_id: v.transction_id,
            order_items: [],
            order_date: v.created_at,
          };
        }),
      });
    }
  );
};

const viewMyOrders = (req, res) => {
  let page = 1;
  let limit = 20;
  const filters = ["paid", "canceled", "pending", "completed", "all"];
  let filter = "all";
  if (filters.includes(req.query?.filter?.toLowerCase())) {
    filter = req.query?.filter?.toLowerCase();
  }
  if (parseInt(req.query.page) || parseInt(req.query.page) > 0) {
    page = Math.ceil(parseInt(req.query.page));
  }
  if (parseInt(req.query.limit) || parseInt(req.query.limit) > 0) {
    limit = Math.ceil(parseInt(req.query.limit));
  }

  let offset = (page - 1) * limit;
  const getOrdersQuery = `SELECT * FROM ORDERS WHERE owner=${SQLescape.escape(
    req.user.email
  )}${
    filter != "all" ? " AND status=" + SQLescape.escape(filter) : ""
  } LIMIT ${limit} OFFSET ${offset}`;
  excuteSQL(
    `SELECT COUNT(*) as total FROM ORDERS WHERE owner=${SQLescape.escape(
      req.user.email
    )}${filter != "all" ? " AND status=" + SQLescape.escape(filter) : ""};` +
      getOrdersQuery,
    (err, orders) => {
      if (err) {
        logger.error(err.error);
        return res.sendStatus(403);
      }
      const total = orders[0].at(-1).total;
      if (total <= 0)
        return res.send({
          error: "There is no orders listed orders to show",
          code: "no_orders",
        });
      if (page > Math.ceil(total / limit))
        return res.status(400).send({
          error: `invalid page number (max pages:${Math.ceil(total / limit)})`,
          code: "invalid_page",
        });
      // const getProductsQuery = `SELECT name,`
      return res.send({
        message: `page ${page} out of ${Math.ceil(total / limit)}`,
        orders: orders.at(-1).map((v) => {
          return {
            order_id: v.id,
            order_owner: v.owner,
            order_total: v.total,
            order_status: v.status,
            order_transction_id: v.transction_id,
            order_items: [],
            order_date: v.created_at,
          };
        }),
      });
    }
  );
};

const viewOrder = (req, res) => {
  if (!req.params.order) {
    logger.error("no order id inserted in params");
    return res.status(400).send({
      error: "unhandled error, please contact the admin",
      code: "unexpected_error",
    });
  }
  const getOrderQuery = `SELECT orders.*,users.email_address FROM ORDERS LEFT JOIN USERS ON ORDERS.owner=users.email_address WHERE orders.ID=${SQLescape.escape(
    req.params.order
  )} ${
    req.role == "admin"
      ? ""
      : `AND ORDERS.owner=${SQLescape.escape(req.user.email)}`
  };`;
  const getOrderItems = `SELECT ORDERS_ITEMS.qty,PRODUCTS.name,PRODUCTS.id FROM ORDERS_ITEMS LEFT JOIN PRODUCTS ON PRODUCTS.id=ORDERS_ITEMS.product_id WHERE ORDER_ID=${SQLescape.escape(
    req.params.order
  )}`;
  excuteSQL(getOrderQuery + getOrderItems, (err, order) => {
    if (err) {
      logger.error(err.error);
      return res.status(400).send({
        error: "unhandled error, please contact the admin",
        code: "unexpected_error",
      });
    }
    if (order.at(-1).length == 0 || order[0]?.length == 0) {
      return res.send({
        error: "no order found!",
        code: "invalid_order_id",
      });
    }

    return res.send({
      order_id: order[0].at(-1).id,
      order_total: order[0].at(-1).total,
      order_owner: order[0].at(-1).owner,
      order_status: order[0].at(-1).status,
      order_transction_id: order[0].at(-1).transction_id,
      order_payment_method: order[0].at(-1).payment_method,
      order_date: order[0].at(-1).created_at,
      order_items: [
        ...order.at(-1).map((p) => ({
          product_id: p.id,
          product_name: p.name,
          qty: p.qty,
        })),
      ],
    });
  });

  // return res.status(500).send("200");
  // if (req?.role.toLowerCase() != "admin") {
  //   return res
  //     .status(401)
  //     .send({ error: "insufficient privilege", code: "privilege_error" });
  // }
};

module.exports = {
  viewMyOrders,
  viewOrders,
  viewOrder,
};
