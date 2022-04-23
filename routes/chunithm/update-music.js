const { checkAndGetCardNumber, sendInfo, getUserId, generateId, checkParams } = require('../../utils/request-utils');
const Database = require('@decafcode/sqlite');

const { Router } = require('express');
const multipart = require('connect-multiparty');
const router = Router();
const multipartMiddleware = multipart({});

router.get('/', multipartMiddleware, async function (req, res) {
  const dbPath = `${process.env.MINIME_PATH}/data/db.sqlite3`;
  const cardInfo = checkAndGetCardNumber(req, dbPath, res);
  if (cardInfo == null) {
    return;
  }

  const cardNumber = cardInfo.cardNumber;
  const db = new Database(dbPath);
  const id = getUserId(db, cardNumber, res, true);
  if (id === null) {
    return;
  }

  const kopKing = process.env.KOP_KING_NAME;
  const kopKingInput = req.query.kop_king;
  if (checkParams(kopKing, kopKingInput) && kopKing === kopKingInput) {
    kopChampion(res, db, id);
    return;
  }

  const musicId = req.query.mid;
  const score = req.query.score;
  const level = req.query.lv;
  const isFc = req.query.is_fc;
  const isAj = req.query.is_aj;

  if (!checkParams(musicId, score)) {
    sendInfo(res, -3, 'input basical music info! (id and score)');
    return;
  }
  if (score < 975000) {
    sendInfo(res, -9, '没到S, 重打');
    return;
  }
  const levelStr = (level === undefined || level === '') ? '3' : level;
  const isFcB = (isFc === '1') ? true : false;
  const isAjB = (isAj === '1') ? true : false;

  modifyScore(res, db, id, musicId, score, levelStr, isFcB, isAjB);
});

function kopChampion(res, db, profileId) {
  try {
    const insertStmt = db.prepare(
      'INSERT INTO c3_user_music (id,profile_id,music_id,level,play_count,score_max,miss_count,max_combo_count,is_full_combo,is_all_justice,is_success,full_chain,max_chain,score_rank,is_lock,theory_count,ext1) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)');
    for (var i = 0; i < 9999; i++) {
      for (var j = 0; j <= 5; j++) {
        insertStmt.run([
          generateId(),
          profileId,
          i,
          j,
          1,
          1010000,
          0,
          0,
          'true',
          'true',
          'true',
          0,
          0,
          12,
          'false',
          1,
          0
        ]);
      }
    }
    sendInfo(res, 0, 'ur the champion!');
  } catch (e) {
    sendInfo(res, -6, 'modify error! ' + e);
  }
}

function modifyScore(res, db, profileId, mid, score, levelStr, isFcB, isAjB) {
  try {
    const result = db.prepare(
      `SELECT * FROM c3_user_music WHERE profile_id = '${profileId}' AND music_id = '${mid}' AND level = '${levelStr}'`
    ).all();
    console.log('result = ' + result);
    // 插入数据
    if (result.length === 0) {
      const insertStmt = db.prepare(
        'INSERT INTO c3_user_music (id,profile_id,music_id,level,play_count,score_max,miss_count,max_combo_count,is_full_combo,is_all_justice,is_success,full_chain,max_chain,score_rank,is_lock,theory_count,ext1) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)');
      insertStmt.run([
        generateId(),
        profileId,
        mid,
        levelStr,
        1,
        score,
        0,
        0,
        (isFcB || isAjB).toString(),
        isAjB.toString(),
        'true',
        0,
        0,
        10,
        'false',
        0,
        0
      ]);
      console.log('insert');
    }
    // 修改数据
    else {
      const { is_full_combo, is_all_justice } = result[0];
      const updateStmt = db.prepare(
        'UPDATE c3_user_music SET score_max = ?, is_full_combo = ?, is_all_justice = ? WHERE profile_id = ? AND music_id = ? AND level = ?');
      updateStmt.run([score, is_full_combo || isFcB || is_all_justice || isAjB, is_all_justice || isAjB, profileId, mid, levelStr]);
      console.log('modify');
    }
    sendInfo(res, 0, 'success');
  } catch (e) {
    sendInfo(res, -6, 'modify error! ' + e);
  }
}

module.exports = router;
