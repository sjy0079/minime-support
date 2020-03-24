const {checkAndGetCardNumber} = require('../../utils/request-utils');
const {generateId} = require('../../utils/request-utils');
const Database = require('@decafcode/sqlite');

const express = require('express');
const multipart = require('connect-multiparty');
const router = express.Router();
const multipartMiddleware = multipart({});

/**
 * 支持的行为：解花，超解花，反超解
 */
const actions = ['kaika', 'choKaika', 'hanChoKaika'];

router.get('/', multipartMiddleware, async function(req, res) {
  const dbPath = `${process.env.MINIME_PATH}/data/db.sqlite3`;
  const paramsCardInfo = checkAndGetCardNumber(req, dbPath, res);
  const paramOngekiCardId = req.query.ongeki_card_id;
  const paramAction = req.query.action;
  if (paramsCardInfo == null) {
    return;
  }
  const cardNumber = paramsCardInfo.cardNumber;
  if (paramOngekiCardId === undefined || paramOngekiCardId === '') {
    res.send({
      code: -3,
      msg: 'input ongeki card id',
    });
    return;
  }
  if (paramAction === undefined || paramAction === '') {
    res.send({
      code: -3,
      msg: 'input card action',
    });
    return;
  }
  if (actions.indexOf(paramAction) === -1) {
    res.send({
      code: -3,
      msg: 'don not support this action',
    });
    return;
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
      doAction(db, id, paramOngekiCardId, paramAction);
    } else {
      res.send({
        code: -1,
        msg: 'don\'t have this card!',
      });
      return;
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
 * 进行操作：目前支持解花与超解花
 */
function doAction(db, id, cardId, action) {
  let param;
  let date = '1970-01-01T00:00:00.000Z';
  if (action === 'kaika') {
    param = 'kaika_date';
  } else if (action === 'choKaika') {
    param = 'cho_kaika_date';
  } else if (action === 'hanChoKaika') {
    param = 'cho_kaika_date';
    date = '0000-00-00T00:00:00.000Z';
  }
  const itemUpdateStmt = db.prepare(
      `UPDATE mu3_user_card SET ${param} = '${date}'  WHERE profile_id = ? AND card_id = ?`);
  itemUpdateStmt.run([id, cardId]);
}

module.exports = router;

