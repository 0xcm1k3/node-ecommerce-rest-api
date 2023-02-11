const logger = require("../helpers/logger");
const { generateUUID } = require("../helpers/encryption");
const uploadImage = async (req, res) => {
  if (
    req.role?.toLowerCase() != "admin" &&
    req.role?.toLowerCase() != "merchant"
  ) {
    return res
      .status(401)
      .send({ error: "insufficient privilege", code: "privilege_error" });
  }
  const allowed_exts = ["png", "jpeg", "jpg"];
  if (!req.files) {
    logger.error("user did not select a file to upload");
    return res.status(400).send({
      error: "unhandled error, please contact the admin",
      code: "unexpected_error",
    });
  }
  const fileName = req.files.upload.name;
  const fileExt = fileName.split(".").at(-1).toLowerCase();

  if (!allowed_exts.includes(fileExt)) {
    logger.error(`${req.user.email} => failed uploading ${fileName}`);
    return res.status(403).send({
      error: "invalid file extension",
      code: "invalid_file_extension",
    });
  }
  const imageUID = generateUUID();
  try {
    await req.files.upload.mv(`./uploads/${imageUID}.${fileExt}`, (err) => {
      if (err) {
        logger.debug(`filed moving ${fileName} to server storage`);
        logger.error(err);
        return res.status(400).send({
          error: "unhandled error, please contact the admin",
          code: "unexpected_error",
        });
      }
      const imageURL = `${process.env.SERVER_ADDR}/uploads/${imageUID}.${fileExt}`;
      return res.send({
        imageURL,
      });
    });
  } catch (e) {
    logger.error(e.message ?? e);
    return res.status(403).send({
      error: "invalid file extension",
      code: "invalid_file_extension",
    });
  }
};

module.exports = {
  uploadImage,
};
