const fs = require('fs');
const {randomBytes} = require('crypto');

// noinspection JSClosureCompilerSyntax
/**
 * 检查card入参以及数据库path
 *
 * @param req 请求request
 * @param dbPath 数据库存放位置
 * @param res 请求response
 * @returns {source: string, cardNumber: string} 卡号与来源
 */
function checkAndGetCardNumber(req, dbPath, res) {
  const cardId = req.query.card;
  const cardNumberInput = req.query.card_number;
  let source = '';
  if ((cardId === undefined || cardId === '') &&
      (cardNumberInput === undefined || cardNumberInput === '')) {
    res.send({
      code: -3,
      msg: 'input your card id! (in bin/DEVICE/felica.txt or aime.txt)',
    });
    return null;
  }
  if (!fs.existsSync(dbPath)) {
    console.log('minime db not found!');
    res.send({
      code: -1,
      msg: 'minime db not found!',
    });
    return null;
  }
  let cardNumber;
  if (cardNumberInput !== undefined && cardNumberInput !== '') {
    cardNumber = cardNumberInput;
    source = 'aime';
  } else {
    try {
      cardNumber = BigInt(`0x${cardId}`).toString(10);
      source = 'felica';
    } catch (e) {
      res.send({
        code: -5,
        msg: 'invalid card id!',
      });
      return null;
    }
  }
  while (cardNumber.length < 20) {
    cardNumber = '0' + cardNumber;
  }
  console.log(`card number is: ${cardNumber}`);
  return {
    cardNumber: cardNumber,
    source: source,
  };
}

/**
 * 创建物品id
 */
function generateId() {
  const buf = randomBytes(8);
  buf[0] &= 0x7f; // Force number to be non-negative
  const val = buf.readBigUInt64BE(0);
  return val.toString();
}

module.exports.checkAndGetCardNumber = checkAndGetCardNumber;
module.exports.generateId = generateId;
