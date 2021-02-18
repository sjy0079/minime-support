const fs = require('fs');
const Database = require('@decafcode/sqlite');
const {randomBytes} = require('crypto');

const express = require('express');
const multipart = require('connect-multiparty');
const router = express.Router();
const multipartMiddleware = multipart({});
/**
 * 物品id，规定可查/改的物品，其余不允许查/改
 */
const item_ids = [8000, 110, 5060, 5230, 5310, 5410];
const action_fetch = 'fetch';
const action_modify = 'modify';

/**
 * 创建物品id
 */
function generateId() {
  const buf = randomBytes(8);

  buf[0] &= 0x7f; // Force number to be non-negative

  const val = buf.readBigUInt64BE(0);
  return val.toString();
}

router.get('/', multipartMiddleware, async function(req, res) {
  const dbPath = `${process.env.MINIME_PATH}/data/db.sqlite3`;
  const cardId = req.query.card;
  const action = req.query.action;
  const paramItemId = req.query.item_id;
  const paramItemCount = req.query.item_count;
  if (cardId === undefined || cardId === '') {
    res.send({
      code: -3,
      msg: 'input your card id! (in bin/DEVICE/felica.txt)',
    });
    return;
  }
  if (action_fetch !== action && action_modify !== action) {
    res.send({
      code: -3,
      msg: 'invalid action!',
    });
    return;
  }
  if (action_modify === action &&
      ((paramItemId === undefined || paramItemId === '') ||
          (paramItemCount === undefined || paramItemCount === ''))) {
    res.send({
      code: -3,
      msg: 'modify action should pass item id & item count!',
    });
    return;
  }
  if (action_modify === action &&
      item_ids.indexOf(parseInt(paramItemId.toString())) === -1) {
    res.send({
      code: -3,
      msg: 'invalid item id!',
    });
    return;
  }
  if (!fs.existsSync(dbPath)) {
    console.log('minime db not found!');
    res.send({
      code: -1,
      msg: 'minime db not found!',
    });
    return;
  }
  const db = new Database(dbPath);
  let cardNumber;
  try {
    cardNumber = BigInt(`0x${cardId}`).toString(10);
  } catch (e) {
    res.send({
      code: -5,
      msg: 'invalid card id!',
    });
    return;
  }
  while (cardNumber.length < 20) {
    cardNumber = '0' + cardNumber;
  }
  console.log(`card number is: ${cardNumber}`);
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
  const {id} = users[0];
  if (action === action_modify) {
    modifyData(db, id, paramItemId, paramItemCount);
    res.send({
      code: 0,
      msg: 'success',
    });
  } else {
    sendData(res, fetchData(db, id));
  }
});

/**
 * 获取道具数据
 */
function fetchData(db, id) {
  let idLimitStatement = '';
  for (let itemId of item_ids) {
    if (idLimitStatement.length !== 0) {
      idLimitStatement += ' OR ';
    }
    idLimitStatement += `item_id = '${itemId}'`;
  }
  const itemStmt = db.prepare(
      `SELECT * FROM cm_user_item WHERE profile_id = '${id}' AND (${idLimitStatement}) AND item_kind = 5`);
  return itemStmt.all();
}

/**
 * 修改道具数量
 */
function modifyData(db, profileId, itemId, itemCount) {
  const itemStmt = db.prepare(
      `SELECT * FROM cm_user_item WHERE profile_id = '${profileId}' AND item_id = '${itemId}' AND item_kind = 5`);
  const result = itemStmt.all();
  // 插入数据
  if (result.length === 0) {
    const itemInsertStmt = db.prepare(
        'INSERT INTO cm_user_item (id, profile_id, item_kind, item_id, stock, is_valid) VALUES (?,?,?,?,?,?)');
    itemInsertStmt.run([
      generateId(),
      profileId,
      5, // item_kind
      itemId, // item_id
      itemCount, // stock
      'true', // is_valid
    ]);
  }
  // 修改数据
  else {
    const itemUpdateStmt = db.prepare(
        'UPDATE cm_user_item SET stock = ? WHERE profile_id = ? AND item_kind = 5 AND item_id = ?');
    itemUpdateStmt.run([itemCount, profileId, itemId]);
  }
}

/**
 * 发送数据
 * BigNumber无法通过json传递，所以先全转成string
 */
function sendData(res, tableData) {
  if (tableData === null || tableData.length === 0) {
    res.send({});
  } else {
    for (let column of tableData) {
      Object.keys(column).forEach(k => {
        column[k] = column[k].toString();
      });
    }
    res.send(tableData);
  }
}

module.exports = router;

