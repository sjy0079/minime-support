const {checkAndGetCardNumber} = require('../utils/request-utils');
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
  'cm_user_general_data',

  'mu3_user_card',
];

const tables_id = [
  'cm_user_data',
  'cm_user_data_ex',
  'cm_user_game_option',
  'cm_user_game_option_ex',

  'mu3_user_data',
];

router.get('/', multipartMiddleware, async function(req, res) {
  const dbPath = `${process.env.MINIME_PATH}/data/db.sqlite3`;
  const cardInfo = checkAndGetCardNumber(req, dbPath, res);
  if (cardInfo == null) {
    return;
  }
  const cardNumber = cardInfo.cardNumber;
  const tableName = req.query.table;
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
  const db = new Database(dbPath);
  let usersStmt;
  let users;
  if (cardInfo.source === "felica") {
    usersStmt = db.prepare(
    `SELECT id FROM cm_user_data WHERE access_code = '${cardNumber}'`);
    users = usersStmt.all();
  } else {
    usersStmt = db.prepare(
        `SELECT id FROM mu3_user_data WHERE access_code = '${cardNumber}'`);
    users = usersStmt.all();
  }
  if (users.length === 0) {
    if (users.length === 0) {
      res.send({
        code: -5,
        msg: 'not such user! check your card id.',
      });
      return;
    }
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
	if (column[k] != null) {
          column[k] = column[k].toString();
	}
      });
    }
    res.send(tableData);
  }

});

module.exports = router;

