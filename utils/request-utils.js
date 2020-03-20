const fs = require('fs');
/**
 * 检查card入参以及数据库path
 *
 * @param cardId 卡号
 * @param dbPath 数据库存放位置
 * @param res 请求response
 * @returns 如果check通过，则返回卡号，否则返回null
 */
function checkAndGetCardNumber(cardId, dbPath, res) {
  if (cardId === undefined || cardId === '') {
    res.send({
      code: -3,
      msg: 'input your card id! (in bin/DEVICE/felica.txt)',
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
  try {
    cardNumber = BigInt(`0x${cardId}`).toString(10);
  } catch (e) {
    res.send({
      code: -5,
      msg: 'invalid card id!',
    });
    return null;
  }
  while (cardNumber.length < 20) {
    cardNumber = '0' + cardNumber;
  }
  console.log(`card number is: ${cardNumber}`);
  return cardNumber;
}

module.exports.checkAndGetCardNumber = checkAndGetCardNumber;