const fs = require('fs');
const Database = require('@decafcode/sqlite');

const express = require('express');
const multipart = require('connect-multiparty');
const router = express.Router();
const multipartMiddleware = multipart({});

const tables_profile_id = [
  'cm_user_activity',
  'cm_user_character',
  'cm_user_course',
  'cm_user_duel_list',
  'cm_user_item',
  'cm_user_map',
  'cm_user_music',
  'cm_user_playlog',
];

const tables_id = [
  'cm_user_data',
  'cm_user_data_ex',
  'cm_user_game_option',
  'cm_user_game_option_ex',
];

router.get('/', multipartMiddleware, async function(req, res) {
  const dbPath = `${process.env.MINIME_PATH}/data/db.sqlite3`;
  const cardId = req.query.card;
  const tableName = req.query.table;
  if (cardId === undefined || cardId === '') {
    res.send({
      code: -3,
      msg: 'input your card id! (in bin/DEVICE/felica.txt)',
    });
    return;
  }
  if (tableName === undefined || tableName === '') {
    res.send({
      code: -4,
      msg: 'input table name',
    });
    return;
  }
  if (tables_id.indexOf(tableName) === -1 &&
      tables_profile_id.indexOf(tableName) === -1) {
    res.send({
      code: -5,
      msg: 'not an available table name',
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

  let tableData;
  if (tables_id.indexOf(tableName) !== -1) {
    const tableStmt = db.prepare(
        `SELECT * FROM ${tableName} WHERE id = '${id}'`);
    tableData = tableStmt.all();
  } else {
    const tableStmt = db.prepare(
        `SELECT * FROM ${tableName} WHERE profile_id = '${id}'`);
    tableData = tableStmt.all();
  }

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

});

module.exports = router;

