const {checkAndGetCardNumber} = require('../../utils/request-utils');
const {generateId} = require('../../utils/request-utils');
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
  const teamName = req.query.team_name;
  if ((userName === undefined || userName === '') &&
      (teamName === undefined || teamName === '')) {
    res.send({
      code: -3,
      msg: 'input modify info! (user name or team name)',
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
  const {id} = users[0];
  if (userName !== undefined && userName.length > 0) {
    modifyUserInfo(res, db, cardNumber, userName);
  }
  if (teamName !== undefined && teamName.length > 0) {
    modifyTeamInfo(res, db, id, teamName);
  }
});

/**
 * 修改用户名
 */
function modifyUserInfo(res, db, cardNumber, userName) {
  try {
    const itemUpdateStmt = db.prepare(
        'UPDATE cm_user_data SET user_name = ? WHERE access_code = ?');
    itemUpdateStmt.run([userName, cardNumber]);
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
}

/**
 * 修改队伍名
 */
function modifyTeamInfo(res, db, profileId, teamName) {
  try {
    const itemStmt = db.prepare(
        `SELECT * FROM cm_user_general_data WHERE profile_id = '${profileId}' AND key = 'user_team_name'`);
    const result = itemStmt.all();
    // 插入数据
    if (result.length === 0) {
      const itemInsertStmt = db.prepare(
          'INSERT INTO cm_user_general_data (id, profile_id, key, value) VALUES (?,?,?,?)');
      itemInsertStmt.run([
        generateId(),
        profileId,
        'user_team_name',
        teamName,
      ]);
      console.log('insert');
    }
    // 修改数据
    else {
      const itemUpdateStmt = db.prepare(
          'UPDATE cm_user_general_data SET value = ? WHERE profile_id = ? AND key = ?');
      itemUpdateStmt.run([teamName, profileId, 'user_team_name']);
      console.log('modify');
    }
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
}

module.exports = router;
