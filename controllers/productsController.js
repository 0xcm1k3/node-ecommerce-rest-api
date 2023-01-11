const escape = require("escape-html");
const SQLescape = require("sqlstring");
const validator = require("../helpers/validation");
const { excuteSQL } = require("../helpers/database");
const logger = require("../helpers/logger");

const viewProducts = (req, res) => {
  let page = 1;
  let limit = 20;
  if (parseInt(req.query.page) || parseInt(req.query.page) > 0) {
    page = Math.ceil(parseInt(req.query.page));
  }
  if (parseInt(req.query.limit) || parseInt(req.query.limit) > 0) {
    limit = Math.ceil(parseInt(req.query.limit));
  }

  let offset = (page - 1) * limit;
  const productsQuery = `SELECT * FROM PRODUCTS LIMIT ${limit} OFFSET ${offset}`;

  excuteSQL(
    `SELECT COUNT(*) as total FROM PRODUCTS;` + productsQuery,
    (err, products) => {
      if (err) {
        logger.error(err.error);
        return res.send(403);
      }
      const total = products[0].at(-1).total;
      if (total <= 0)
        return res.send({
          error: "There is no products listed products to show",
          code: "no_products",
        });
      if (page > Math.ceil(total / limit))
        return res.status(400).send({
          error: `invalid page number (max pages:${Math.ceil(total / limit)})`,
          code: "invalid_page",
        });
      return res.send({
        message: `page ${page} out of ${Math.ceil(total / limit)}`,
        products: products.at(-1).map((v) => {
          return {
            product_id: v.id,
            product_image: v.imageURL,
            product_name: v.name,
            product_price: v.price,
          };
        }),
      });
    }
  );
};
const viewMyProducts = (req, res) => {
  if (
    req.role?.toLowerCase() != "admin" &&
    req.role?.toLowerCase() != "merchant"
  )
    return res
      .status(401)
      .send({ error: "insufficient privilege", code: "privilege_error" });

  let page = 1;
  let limit = 20;
  if (parseInt(req.query.page) || parseInt(req.query.page) > 0) {
    page = Math.ceil(parseInt(req.query.page));
  }
  if (parseInt(req.query.limit) || parseInt(req.query.limit) > 0) {
    limit = Math.ceil(parseInt(req.query.limit));
  }

  let offset = (page - 1) * limit;

  const productsQuery = `SELECT * FROM PRODUCTS ${
    req.role?.toLowerCase() != "admin"
      ? "WHERE owner=" + SQLescape.escape(req.user.uid)
      : ""
  } LIMIT ${limit} OFFSET ${offset}`;

  excuteSQL(
    `SELECT COUNT(*) as total FROM PRODUCTS ${
      req.role?.toLowerCase() != "admin"
        ? "WHERE owner=" + SQLescape.escape(req.user.uid)
        : ""
    };` + productsQuery,
    (err, products) => {
      if (err) {
        logger.error(err.error);
        return res.res.sendStatus(403);
      }
      const total = products[0].at(-1).total;
      if (total <= 0)
        return res.send({
          error: "There is no products listed products to show",
          code: "no_products",
        });
      if (page > Math.ceil(total / limit))
        return res.status(400).send({
          error: `invalid page number (max pages:${Math.ceil(total / limit)})`,
          code: "invalid_page",
        });
      return res.send({
        message: `page ${page} out of ${Math.ceil(total / limit)}`,
        products: products.at(-1).map((v) => {
          return {
            product_id: v.id,
            product_image: v.imageURL,
            product_name: v.name,
            product_price: v.price,
          };
        }),
      });
    }
  );
};
const addProduct = (req, res) => {
  if (
    req.role?.toLowerCase() != "admin" &&
    req.role?.toLowerCase() != "merchant"
  )
    return res
      .status(401)
      .send({ error: "insufficient privilege", code: "privilege_error" });

  const { product_image, product_name, product_price, product_owner } =
    req.body;

  const toBeAdded = {
    name: product_name,
    imageURL: product_image,
    price: validator.isNumber(parseFloat(product_price))
      ? parseFloat(product_price)
      : undefined,
    owner:
      req.role?.toLowerCase() != "admin"
        ? req.user.uid
        : product_owner
        ? product_owner
        : undefined,
  };

  for ([key, value] of Object.entries(toBeAdded)) {
    if (!value)
      return res
        .status(400)
        .send({ error: `missing ${key}`, code: "missing_param" });
  }

  const addProductQuery = `INSERT INTO PRODUCTS (${Object.entries(toBeAdded)
    .map(([key, _]) => key)
    .join(",")}) VALUES (${Object.entries(toBeAdded)
    .map(([_, value]) => `${SQLescape.escape(value)}`)
    .join(",")});`;
  excuteSQL(addProductQuery, (err, results) => {
    if (err) {
      logger.error(err.error);
      return res.status(400).send({
        error: "unhandled error, please contact the admin",
        code: "unexpected_error",
      });
    }
    return res.send({ message: "success" });
  });
};
const viewProduct = (req, res) => {
  if (!req.params.product)
    return res
      .status(400)
      .send({ error: "invalid request", code: "invalid_request" });
  const getProductQuery = `SELECT * FROM products WHERE ID=${SQLescape.escape(
    req.params.product
  )} LIMIT 1`;
  console.log(getProductQuery);
  excuteSQL(getProductQuery, (err, product) => {
    if (err) {
      logger.error(err);
      return res
        .status(400)
        .send({ error: "invalid request", code: "invalid_request" });
    }
    if (product.length == 0)
      return res.status(404).send({
        error: `product with id ${parseInt(req.params.product)} was not found`,
        code: "product_not_found",
      });
    excuteSQL(
      `SELECT full_name FROM USERS WHERE ID=${SQLescape.escape(
        product.at(-1).owner
      )}`,
      (err, merchant) => {
        if (err) {
          logger.error(err);
          return res
            .status(400)
            .send({ error: "invalid request", code: "invalid_request" });
        }
        return res.send({
          product_image: product.at(-1).imageURL,
          product_name: product.at(-1).name,
          product_price: product.at(-1).price,
          merchant: merchant.at(-1)?.full_name,
        });
      }
    );
  });
};
const updateProduct = (req, res) => {
  if (
    req.role?.toLowerCase() != "admin" &&
    req.role?.toLowerCase() != "merchant"
  )
    return res
      .status(401)
      .send({ error: "insufficient privilege", code: "privilege_error" });

  if (!req.params.product)
    return res
      .status(400)
      .send({ error: "invalid request", code: "invalid_request" });
  const { product_image, product_name, product_price, product_owner } =
    req.body;

  const toBeAdded = {
    name: product_name,
    imageURL: product_image,
    price: validator.isNumber(parseFloat(product_price))
      ? parseFloat(product_price)
      : undefined,
    owner:
      req.role?.toLowerCase() != "admin"
        ? req.user.uid
        : product_owner
        ? product_owner
        : undefined,
  };

  for ([key, value] of Object.entries(toBeAdded)) {
    if (!value)
      return res
        .status(400)
        .send({ error: `missing ${key}`, code: "missing_param" });
  }
  const updateProductQuery = `UPDATE PRODUCTS SET ${Object.entries(toBeAdded)
    .map(([key, value]) => `${key}=${SQLescape.escape(value)}`)
    .join(",")} WHERE id=${SQLescape.escape(req.params.product)} ${
    req.role?.toLowerCase() != "admin"
      ? "AND owner=" + SQLescape.escape(req.user.uid)
      : ""
  }`;
  excuteSQL(updateProductQuery, (err, product) => {
    if (err || product?.affectedRows == 0) {
      logger.error(err);
      return res.status(400).send({
        error: "unhandled error, please contact the admin",
        code: "unexpected_error",
      });
    }
    return res.send({ message: "success" });
  });
};
const deleteProduct = (req, res) => {
  if (
    req.role?.toLowerCase() != "admin" &&
    req.role?.toLowerCase() != "merchant"
  )
    return res
      .status(401)
      .send({ error: "insufficient privilege", code: "privilege_error" });

  if (!req.params.product)
    return res
      .status(400)
      .send({ error: "invalid request", code: "invalid_request" });

  const deleteProductQuery = `DELETE FROM PRODUCTS WHERE id=${SQLescape.escape(
    req.params.product
  )} ${
    req.role?.toLowerCase() != "admin"
      ? "AND owner=" + SQLescape.escape(req.user.uid)
      : ""
  }`;
  excuteSQL(deleteProductQuery, (err, product) => {
    if (err || product?.affectedRows == 0) {
      logger.error(err);
      return res.status(400).send({
        error: "unhandled error, please contact the admin",
        code: "unexpected_error",
      });
    }
    return res.send({ message: "success" });
  });
};

module.exports = {
  viewProducts,
  viewMyProducts,
  viewProduct,
  updateProduct,
  addProduct,
  deleteProduct,
};
