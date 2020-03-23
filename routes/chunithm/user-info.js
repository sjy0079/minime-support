const {checkAndGetCardNumber} = require('../../utils/request-utils');
const Database = require('@decafcode/sqlite');

const express = require('express');
const multipart = require('connect-multiparty');
const router = express.Router();
const multipartMiddleware = multipart({});

router.get('/', multipartMiddleware, async function(req, res) {
  const dbPath = `${process.env.MINIME_PATH}/data/db.sqlite3`;
  const cardInfo = checkAndGetCardNumber(req, dbPath, res);
  if (cardInfo == null) {
    return;
  }
  const cardNumber = cardInfo.cardNumber;
  const userName = req.query.user_name;
  if (userName === undefined || userName === '') {
    res.send({
      code: -3,
      msg: 'input a new name!',
    });
    return;
  }
  const db = new Database(dbPath);
  const usersStmt = db.prepare(
      `SELECT id FROM cm_user_data WHERE access_code = '${cardNumber}'`);
  const users = usersStmt.all();
  if (users.length === 0) {
    res.send({
      code: -5,
      msg: 'not such user! check your card id.',
    });
    return;
  }
  try {
    modifyUserInfo(db, cardNumber, userName);
    res.send({
      code: 0,
      msg: 'success',
    });
  } catch (e) {
    res.send({
      code: -6,
      msg: 'modify error!',
    });
  }
});

/**
 * 修改用户信息
 */
function modifyUserInfo(db, cardNumber, userName) {
  const itemUpdateStmt = db.prepare(
      'UPDATE cm_user_data SET user_name = ? WHERE access_code = ?');
  itemUpdateStmt.run([userName, cardNumber]);
}

module.exports = router;
