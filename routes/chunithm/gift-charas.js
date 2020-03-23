const fs = require('fs');
// const {openSqlite} = require('./bin/sql');
// const checkdb = require('./bin/checkdb').default;
const Database = require('@decafcode/sqlite');
const {randomBytes} = require('crypto');

const express = require('express');
const multipart = require('connect-multiparty');
const router = express.Router();
const multipartMiddleware = multipart({});

const chara_skill_map = JSON.parse(
    '[[480,"100060"],[490,"100060"],[500,"100060"],[510,"100060"],[520,"100060"],[530,"100050"],[540,"100051"],[940,"100098"],[950,"100099"],[960,"100100"],[970,"100101"],[980,"100102"],[990,"100103"],[1000,"100104"],[1010,"100105"],[1080,"100114"],[1090,"100115"],[1100,"100116"],[1110,"100054"],[1120,"100052"],[1130,"100053"],[1140,"100058"],[1150,"100052"],[1160,"100057"],[1340,"100580"],[1350,"100581"],[1360,"100582"],[1420,"100584"],[1430,"100584"],[1440,"100584"],[1450,"100584"],[1460,"100585"],[1470,"100585"],[1480,"100585"],[1490,"100585"],[1700,"101025"],[2060,"100060"],[2070,"100060"],[2080,"100580"],[2090,"101013"],[2100,"101014"],[2110,"101056"],[2230,"101026"],[2420,"101513"],[2430,"101513"],[2440,"101513"],[2450,"101513"],[2460,"101513"],[2570,"101516"],[2580,"101517"],[2590,"101518"],[2600,"101519"],[2610,"101527"],[2620,"101529"],[2630,"101530"],[2640,"101531"],[2650,"101532"],[2730,"101543"],[2880,"101555"],[2890,"101555"],[2900,"101555"],[2910,"101555"],[2920,"101555"],[2930,"101555"],[2940,"101555"],[2980,"101558"],[2990,"101558"],[3000,"101558"],[3150,"101579"],[3160,"101580"],[3170,"101581"],[3390,"102033"],[3400,"102033"],[3410,"102033"],[3420,"102033"],[3430,"102033"],[3440,"102033"],[3450,"102033"],[3740,"102062"],[4170,"102025"],[4180,"102111"],[4190,"102027"],[4200,"102028"],[4210,"102029"],[4220,"102110"],[4230,"102110"],[4240,"102110"],[4250,"102112"],[4500,"102509"],[4530,"102516"],[4540,"102517"],[4550,"102518"],[4560,"102519"],[4570,"102520"],[4580,"102521"],[4600,"101509"],[5330,"102523"],[5340,"102525"],[5350,"102530"],[5360,"102531"],[5370,"102532"],[5380,"102532"],[5390,"102532"],[5400,"102535"],[5410,"102537"],[5430,"102583"],[5440,"102604"],[5550,"102609"],[5560,"102610"],[5700,"100050"],[5710,"100051"],[6460,"103012"],[6470,"103013"],[6480,"103014"],[6490,"103015"],[6500,"103016"],[6520,"103018"],[6530,"102517"],[6540,"102517"],[6620,"103021"],[6630,"103022"],[6640,"103023"],[6650,"103024"],[6730,"103017"],[6740,"103092"],[6750,"103092"]]');

function generateId() {
  const buf = randomBytes(8);

  buf[0] &= 0x7f; // Force number to be non-negative

  const val = buf.readBigUInt64BE(0);
  return val.toString();
}

router.get('/', multipartMiddleware, async function(req, res) {
  const dbPath = `${process.env.MINIME_PATH}/data/db.sqlite3`;
  const cardId = req.query.card;
  if (cardId === undefined || cardId === '') {
    res.send({
      code: -3,
      msg: 'input your card id! (in bin/DEVICE/felica.txt)',
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
  // const dbInit = openSqlite(dbPath);
  //
  // try {
  //   await checkdb(dbInit);
  // } catch (e) {
  //   console.log('Create output db error!');
  //   console.error(e);
  //   res.send({
  //     code: -2,
  //     msg: 'Create output db error!',
  //     err: e,
  //   });
  //   return;
  // }

  let cardNumber = BigInt(`0x${cardId}`).toString(10);
  while (cardNumber.length < 20) {
    cardNumber = '0' + cardNumber;
  }
  console.log(`card number is: ${cardNumber}`);
  const usersStmt = db.prepare(`SELECT id,user_name FROM cm_user_data WHERE access_code = '${cardNumber}'`);
  const users = usersStmt.all();

  if (users.length === 0) {
    res.send({
      code: 0,
      msg: 'not such user! check your card id.',
    });
    return;
  }
  users.forEach(({id, user_name}) => {
    console.log(id, user_name);
    let skill_stock = {};
    db.exec('BEGIN');
    const charaTestStmt = db.prepare(
        'SELECT id FROM cm_user_character WHERE profile_id = ? AND character_id = ?');
    const charaInsertStmt = db.prepare(
        'INSERT INTO cm_user_character (id,profile_id,character_id,play_count,level,skill_id,friendship_exp,is_valid,is_new_mark,param1,param2) VALUES (?,?,?,?,?,?,?,?,?,?,?)');
    let charaCount = 0;
    chara_skill_map.forEach(([c, s]) => {
      const hasChara = charaTestStmt.one([id, c]) !== undefined;
      if (!hasChara) {
        charaInsertStmt.run([
          generateId(),
          id,
          c, // chara_id
          0, // play_count
          1, // level
          s, // skill_id
          0, // exp
          'true', // is_valid
          'true', // is_new
          0, // param1 - awaken level
          0, // param2
        ]);
        skill_stock[s] = skill_stock[s] || 0;
        skill_stock[s]++;
        charaCount++;
      }
    });
    const charaAddInfo = `Added ${charaCount} new characters`;
    console.log(charaAddInfo);

    const skillTestStmt = db.prepare(
        'SELECT stock FROM cm_user_item WHERE profile_id = ? AND item_kind = 4 AND item_id = ?');
    const skillUpdateStmt = db.prepare(
        'UPDATE cm_user_item SET stock = ? WHERE profile_id = ? AND item_kind = 4 AND item_id = ?');
    const skillInsertStmt = db.prepare(
        'INSERT INTO cm_user_item (id, profile_id, item_kind, item_id, stock, is_valid) VALUES (?,?,?,?,?,?)');
    let skillUpdateCount = 0, skillInsertCount = 0;
    Object.keys(skill_stock).forEach(s => {
      const skillTestRow = skillTestStmt.one([id, s]);
      if (skillTestRow !== undefined) {
        skillUpdateStmt.run([skill_stock[s] + parseInt(skillTestRow.stock), id, s]);
        skillUpdateCount++;
      } else {
        skillInsertStmt.run([
          generateId(),
          id,
          4, // item_kind
          s, // item_id
          skill_stock[s], // stock
          'true', // is_valid
        ]);
        skillInsertCount++;
      }
    });
    console.log(
        `Added ${skillInsertCount} new skills & updated ${skillUpdateCount} skills`);
    db.exec('COMMIT');
    res.send({
      code: 0,
      msg: `${charaAddInfo}. Added ${skillInsertCount} new skills & updated ${skillUpdateCount} skills.`,
    });
  });
});

module.exports = router;

