const mysql = require("mysql");
const { hashThis } = require("./encryption");
const logger = require("./logger");
const Logger = require("./logger");

require("dotenv").config();

const db_config = {
  multipleStatements: true,
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USERNAME || "db_user",
  password: process.env.DB_PASSWORD || "db_pwd",
  database: process.env.DB_NAME || "db_name",
};

const initDB = async (callback) => {
  try {
    var error;
    var connection = mysql.createConnection(db_config);
    const init_query = `CREATE TABLE IF NOT EXISTS USERS (
        ID int NOT NULL AUTO_INCREMENT,
        full_name varchar(255) NOT NULL,
        email_address varchar(255) UNIQUE,
        password varchar(255) NOT NULL,
        stripe_id varchar(255),
        role ENUM("ADMIN","CLIENT","MERCHANT") NOT NULL,
        registeredAt TIMESTAMP  DEFAULT CURRENT_TIMESTAMP NOT NULL,
        lastSeenAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        PRIMARY KEY (ID),
        UNIQUE (ID)
    );
    CREATE TABLE IF NOT EXISTS CATEGORIES (
      ID int NOT NULL AUTO_INCREMENT,
      name varchar(255) NOT NULL UNIQUE,
      PRIMARY KEY (ID),
      UNIQUE (ID)
  );
    CREATE TABLE IF NOT EXISTS ORDERS (
        ID int NOT NULL AUTO_INCREMENT,
        owner varchar(255) NOT NULL,
        total varchar(255) NOT NULL,
        status ENUM("COMPLETED","CANCELED","PENDING","PAID") NOT NULL,
        transction_id varchar(255) NOT NULL,
        payment_method ENUM("STRIPE","PAYPAL") NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        PRIMARY KEY (ID),
        UNIQUE (ID),
        FOREIGN KEY (owner) REFERENCES USERS(email_address)
    );
    CREATE TABLE IF NOT EXISTS PRODUCTS (
      ID int NOT NULL AUTO_INCREMENT,
      name varchar(255) NOT NULL,
      price varchar(255) NOT NULL,
      category int NOT NULL,
      owner int NOT NULL,
      imageURL varchar(255),
      PRIMARY KEY (ID),
      UNIQUE (ID),
      FOREIGN KEY (category) REFERENCES CATEGORIES(ID),
      FOREIGN KEY (owner) REFERENCES USERS(ID)
  );
  CREATE TABLE IF NOT EXISTS ORDERS_ITEMS (
    ID int NOT NULL AUTO_INCREMENT,
    product_id int NOT NULL,
    qty varchar(255),
    order_id int,
    merchant int,
    PRIMARY KEY (ID),
    UNIQUE (ID),
    FOREIGN KEY (product_id) REFERENCES PRODUCTS(ID),
    FOREIGN KEY (order_id) REFERENCES ORDERS(ID),
    FOREIGN KEY (merchant) REFERENCES USERS(ID)
);`;

    // default admin creds {email_address:admin@admin.com,password:admin123}
    const defaultCredsQuery = `INSERT IGNORE INTO USERS (full_name, email_address, password, role) VALUES ("admin admin","admin@admin.com",\"${hashThis(
      "admin123"
    )}\","ADMIN");`;
    const defaultCategoriesQuery = `INSERT IGNORE INTO CATEGORIES (id,name) VALUE (3,'vegtables'),(2,'fruits'),(1,'others');`;
    connection.connect();
    connection.query(
      init_query + defaultCredsQuery + defaultCategoriesQuery,
      (error, results, fields) => {
        if (error) error = error?.sqlMessage ?? error;
        callback(error);
      }
    );
    connection.end();
  } catch (e) {
    error = e;
    logger.error(e);
  }
};
const excuteSQL = (query, callback) => {
  var connection = mysql.createConnection(db_config);
  connection.connect();
  connection.query(query, function (error, results, fields) {
    if (error) error = { error: error?.sqlMessage, code: error?.code };
    callback(error, results);
  });
  connection.end();
};

module.exports = {
  excuteSQL,
  initDB,
};
