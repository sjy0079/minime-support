const {checkAndGetCardNumber} = require('../../utils/request-utils');
const {generateId} = require('../../utils/request-utils');
const Database = require('@decafcode/sqlite');

const express = require('express');
const multipart = require('connect-multiparty');
const router = express.Router();
const multipartMiddleware = multipart({});

router.get('/', multipartMiddleware, async function(req, res) {
  const dbPath = `${process.env.MINIME_PATH}/data/db.sqlite3`;
  const paramsCardInfo = checkAndGetCardNumber(req, dbPath, res);
  const paramOngekiCardId = req.query.ongeki_card_id;
  if (paramsCardInfo == null) {
    return;
  }
  const cardNumber = paramsCardInfo.cardNumber;
  if (paramOngekiCardId === undefined || paramOngekiCardId === '') {
    res.send({
      code: -3,
      msg: 'input ongeki card id',
    });
  }
  const db = new Database(dbPath);
  const usersStmt = db.prepare(
      `SELECT id FROM mu3_user_data WHERE access_code = '${cardNumber}'`);
  const users = usersStmt.all();
  if (users.length === 0) {
    res.send({
      code: -5,
      msg: 'not such user! check your card id.',
    });
    return;
  }

  const {id} = users[0];
  const cardStmt = db.prepare(
      `SELECT * FROM mu3_user_card WHERE profile_id = '${id}' AND card_id = ${paramOngekiCardId}`);
  const cardInfo = cardStmt.all();
  try {
    if (cardInfo.length > 0) {
      const {digital_stock} = cardInfo[0];
      starUp(db, id, paramOngekiCardId, Number(digital_stock));
    } else {
      getCard(db, id, paramOngekiCardId);
    }
  } catch (e) {
    res.send({
      code: -1,
      msg: e.toString(),
    });
    return;
  }
  res.send({
    code: 0,
    msg: 'success',
  });
});

/**
 * 如果已经拥有卡片，则升星（digital_stock + 1）
 */
function starUp(db, id, cardId, stock) {
  const itemUpdateStmt = db.prepare(
      'UPDATE mu3_user_card SET digital_stock = ? WHERE profile_id = ? AND card_id = ?');
  itemUpdateStmt.run([stock + 1, id, cardId]);
}

/**
 * 如果未拥有卡片，则获得
 */
function getCard(db, id, cardId) {
  const itemInsertStmt = db.prepare(
      'INSERT INTO mu3_user_card (' +
      ' id, profile_id, card_id, digital_stock,' +
      ' analog_stock, level, max_level, exp,' +
      ' print_count, use_count, is_new, kaika_date,' +
      ' cho_kaika_date, skill_id, is_acquired, created) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)');
  itemInsertStmt.run([
    generateId(), id, cardId, 1,
    0, 1, 10, 0,
    1, 0, 'true', '1970-01-01T00:00:00.000Z',
    '1970-01-01T00:00:00.000Z', 0, 'true', '2020-03-21T00:00:00.000Z',
  ]);
}

module.exports = router;

