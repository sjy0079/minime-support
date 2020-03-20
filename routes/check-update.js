const express = require('express');
const multipart = require('connect-multiparty');
const router = express.Router();
const multipartMiddleware = multipart({});

router.get('/', multipartMiddleware, async function(req, res) {
  res.send({
    code: 0,
    version: process.env.NOW_VERSION,
    url: process.env.APK_URL
  });
});

module.exports = router;
