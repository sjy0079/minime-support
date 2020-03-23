let express = require('express');
let multipart = require('connect-multiparty');
let bs3 = require('better-sqlite3');

let router = express.Router();
let multipartMiddleware = multipart({});

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

const db_url = `${process.env.MINIME_PATH}/data/db.sqlite3`;

router.post('/', multipartMiddleware, function(req, res) {
  let db = bs3(req.files.db.path, {verbose: console.log});
  // backup
  const exec = require('child_process').exec;
  let backupName = `data_backup_${new Date().valueOf()}`;
  let mkdirStr = `mkdir ${backupName}`;
  exec(mkdirStr, function(err, stdout, stderr) {
  });
  let cpStr = `cp ${db_url} ${mkdirStr}/`;
  exec(cpStr, function(err, stdout, stderr) {
  });
  // read
  let originDb = bs3(db_url, {verbose: console.log});
  let aimeUsers = [];
  let profileIds = [];
  // find all user in db
  try {
    let aimeStmt = db.prepare('SELECT * FROM aime_player');
    aimeStmt.safeIntegers();
    for (const row of aimeStmt.iterate()) {
      aimeUsers.push(row.luid);
    }
    for (const user of aimeUsers) {
      let userDataStmt = db.prepare(
          'SELECT * FROM cm_user_data WHERE access_code = ?');
      userDataStmt.safeIntegers();
      let row = userDataStmt.get(user.toString());
      if (row) {
        profileIds.push(row.id);
      }
    }
  } catch (e) {
    res.send({
      code: -1,
      msg: 'WRONG DATABASE',
      err: e,
    });
    return;
  }
  // delete exist info
  try {
    for (const profileId of profileIds) {
      for (const table of tables_profile_id) {
        let stmt = originDb.prepare(
            `DELETE FROM ${table} WHERE profile_id = ?`);
        stmt.safeIntegers();
        stmt.run(profileId.toString());
      }
      for (const table of tables_id) {
        let stmt = originDb.prepare(`DELETE FROM ${table} WHERE id = ?`);
        stmt.safeIntegers();
        stmt.run(profileId.toString());
      }
      for (const user of aimeUsers) {
        let stmt = originDb.prepare(`DELETE FROM aime_player WHERE luid = ?`);
        stmt.safeIntegers();
        stmt.run(user.toString());
      }
    }
  } catch (e) {
    res.send({
      code: -2,
      msg: 'DELETE ERROR',
      err: e,
    });
    return;
  }

  try {
    insertTable('aime_player', db, originDb);
    for (const table of tables_id) {
      insertTable(table, db, originDb);
    }
    for (const table of tables_profile_id) {
      insertTable(table, db, originDb);
    }
  } catch (e) {
    res.send({
      code: -3,
      msg: 'INSERT ERROR',
      err: e,
    });
    return;
  }

  res.send({
    code: 0,
    msg: 'SUCCESS',
  });
});

/**
 * insert info
 */
function insertTable(table, insertDb, originDb) {
  let insertStmt;
  try {
    insertStmt = insertDb.prepare(`SELECT * FROM ${table}`);
    insertStmt.safeIntegers();
  } catch (e) {
    return;
  }
  let insertLine = '';
  for (const row of insertStmt.iterate()) {
    let line = '(';
    for (const kv in row) {
      line += '\'' + row[kv].toString() + '\'';
      line += ',';
    }
    if (line.charAt(line.length - 1) === ',') {
      line = line.substr(0, line.length - 1);
    }
    line += ')';
    insertLine += line;
    insertLine += ',';
  }
  if (insertLine.length === 0) {
    return;
  }
  if (insertLine.charAt(insertLine.length - 1) === ',') {
    insertLine = insertLine.substr(0, insertLine.length - 1);
  }
  console.log(insertLine);
  let originStmt = originDb.prepare(
      `INSERT INTO ${table} VALUES ${insertLine}`);
  originStmt.run();
}

module.exports = router;