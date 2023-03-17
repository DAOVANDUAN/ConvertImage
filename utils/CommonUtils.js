let exported = {}

module.exports = exported

const fs = require('fs')
const CryptoJS = require('crypto-js')
const crypto = require('crypto')
const CONFIG = require('../config')

function generateContainerBarcodeId(qrPusInfo) {
  return '' + qrPusInfo.maDoanhNghiep + '_' + qrPusInfo.soToKhai + '_' + qrPusInfo.maHaiQuan + '_' + qrPusInfo.ngayToKhai.replace(/\//g, '')
}

function safeName(str) {
  str += ''
  str = str.replace(/[^a-zA-Z0-9-_.]/g, '-').replace(/-{2,}/g, '-')
  return str
}

function convertFileName(str) {
  // return str
  str += ''
  // str = str.replace(/[^a-zA-Z0-9-_.]/g, '-').replace(/-{2,}/g, '-')
  str = str.replace(/[\/\\\?\!@#\$%\^&*\[\]<>\'\"~\r\n\t]/g, '-').replace(/-{2,}/g, '-')
  return str
}

const formatter = new Intl.NumberFormat('en-US', {
  style: 'decimal'
});

function formatMoney(number, decPlaces, decSep, thouSep) {
  return formatter.format(number)
}

function formatNumber(number, decPlaces, decSep, thouSep) {
  return formatter.format(number)
}

function dateTimeFormat(dateTime) {
  if (!dateTime) return ''
  return [dateTime.getFullYear(), padding(dateTime.getMonth() + 1, 2), padding(dateTime.getDate(), 2)].join('-') + ' ' + 
    [padding(dateTime.getHours(), 2), padding(dateTime.getMinutes(), 2), padding(dateTime.getSeconds(), 2)].join(':')
}

function dateTimeFormatVN(dateTime) {
  if (!dateTime) return ''
  return [dateTime.getFullYear(), padding(dateTime.getMonth() + 1, 2), padding(dateTime.getDate(), 2)].reverse().join('/') + ' ' +
    [padding(dateTime.getHours(), 2), padding(dateTime.getMinutes(), 2), padding(dateTime.getSeconds(), 2)].join(':')
}

function dateTimeFormatShort(dateTime) {
  if (!dateTime) return ''
  return [dateTime.getFullYear() - 2000, padding(dateTime.getMonth() + 1, 2), padding(dateTime.getDate(), 2)].join('') + ' ' +
    [padding(dateTime.getHours(), 2), padding(dateTime.getMinutes(), 2), padding(dateTime.getSeconds(), 2)].join(':')
}

function dateTimeFormatHHMMSSDDMMYY(dateTime) {
  if (!dateTime) return ''
  return [padding(dateTime.getHours(), 2), padding(dateTime.getMinutes(), 2), padding(dateTime.getSeconds(), 2)].join(':') + '. ' + [dateTime.getFullYear() - 2000, padding(dateTime.getMonth() + 1, 2), padding(dateTime.getDate(), 2)].reverse().join('/')
}

function dateFormat(dateTime) {
  if (!dateTime) return ''
  return [dateTime.getFullYear(), padding(dateTime.getMonth() + 1, 2), padding(dateTime.getDate(), 2)].join('-')
}

function dateFormatVN(dateTime) {
  if (!dateTime) return ''
  return [dateTime.getFullYear(), padding(dateTime.getMonth() + 1, 2), padding(dateTime.getDate(), 2)].reverse().join('/')
}

function timeFormat(dateTime) {
  if (!dateTime) return ''
  return [padding(dateTime.getHours(), 2), padding(dateTime.getMinutes(), 2), padding(dateTime.getSeconds(), 2)].join(':')
}

function padding(str, len) {
  str += ''
  while (str.length < len) {
    str = '0' + str
  }
  return str
}

function md5sum(filePath) {
  let checksum = ''
  // try {
  //   checksum = CryptoJS.MD5(CryptoJS.enc.Latin1.parse(fs.readFileSync(filePath).toString('latin1'))).toString()
  // } catch (e) {
  //   console.log(e);
  // }
  let data = fs.readFileSync(filePath)

  try {
    checksum = crypto.createHash('md5').update(data, 'utf8').digest('hex')
  } catch (e) {
    console.log(e);
  }

  return checksum
}

function encryptAES(plain, secret) {
  return CryptoJS.AES.encrypt(plain, secret ? secret : CONFIG.secretKeyForToken).toString()
}

function decryptAES(cipher, secret) {
  return CryptoJS.AES.decrypt(cipher, secret ? secret : CONFIG.secretKeyForToken).toString(CryptoJS.enc.Utf8)
}

function fileSizeFormat(size) {
  let units = ['B', 'kB', 'MB', 'GB', 'TB']
  let idx = 0
  let flag = false
  while (size >= 1024) {
    flag = true
    size /= 1024
    idx++
  }

  let sizeStr = flag ? size.toFixed(1) : size

  if (sizeStr.indexOf('.0') == sizeStr.length - 2) {
    sizeStr = sizeStr.substring(0, sizeStr.length - 2)
  }

  return sizeStr + ' ' + units[idx]
}

function degreeToDMS(degree) {
  let d = Math.floor(degree)
  let dotD = degree - d
  let mM = dotD * 60
  let m = Math.floor(mM)
  let s = Math.floor((mM - m) * 60)
  return {
    degrees: d,
    minutes: m,
    seconds: s,
    str: `${d}°${m}'${s}"`
  }
}

function unixTimeToTicks(d) {
  if (!(d instanceof Date)) {
    return -1
  }
  return d.getTime() * 10000 + 621355968000000000
}

const MAP_CONT_CHARACTER = {
  'A': 10,
  'B': 12,
  'C': 13,
  'D': 14,
  'E': 15,
  'F': 16,
  'G': 17,
  'H': 18,
  'I': 19,
  'J': 20,
  'K': 21,
  'L': 23,
  'M': 24,
  'N': 25,
  'O': 26,
  'P': 27,
  'Q': 28,
  'R': 29,
  'S': 30,
  'T': 31,
  'U': 32,
  'V': 34,
  'W': 35,
  'X': 36,
  'Y': 37,
  'Z': 38,
}

const CONT_EXPONENT_POSITIONS = [1, 2, 4, 8, 16, 32, 64, 128, 256, 512]

function validateContNo(contNo) {
  contNo += ''
  contNo = contNo.toUpperCase()
  let regexTest = /^([A-Z]{3}[UJZ]\d{6})(\d)$/
  if (!regexTest.test(contNo)) {
    return false
  }
  let matches = contNo.match(regexTest)
  let contSerial = matches[1]
  let checksum = matches[2]
  let characters = contSerial.split('')
  let sum = 0
  for(let i = 0; i < characters.length; i++) {
    // console.log('adding', characters[i], 'exponent', CONT_EXPONENT_POSITIONS[i]);
    if (MAP_CONT_CHARACTER.hasOwnProperty(characters[i])) {
      // console.log('map', characters[i], 'to', MAP_CONT_CHARACTER[characters[i]], 'result', MAP_CONT_CHARACTER[characters[i]] * CONT_EXPONENT_POSITIONS[i]);
      sum += MAP_CONT_CHARACTER[characters[i]] * CONT_EXPONENT_POSITIONS[i]
    } else {
      sum += parseInt(characters[i]) * CONT_EXPONENT_POSITIONS[i]
    }
  }
  // console.log('sum', sum);
  // console.log('checksum', checksum);
  // console.log('mod', sum % 11);
  return sum % 11 % 10 == parseInt(checksum) // 10 becomes 0, so we take modulo 10
}

function validateTaxCode(taxCode) {
  taxCode = taxCode ? taxCode : ''
  taxCode += ''
  let regexTest = /^(\d{10})(?:-\d{3})?$/
  if (!regexTest.test(taxCode)) return false
  let matches = taxCode.match(regexTest)
  let mainTaxCode = matches[1]
  let digits = mainTaxCode.split('')
  let bases = [31, 29, 23, 19, 17, 13, 7, 5, 3]
  let sum = 0
  for(let i = 0; i < 9; i++) {
    sum += (mainTaxCode.charCodeAt(i) - 48) * bases[i]
  }
  // return sum % 11 == 10 - (mainTaxCode.charCodeAt(9) - 48)
  return sum % 11 == 58 - mainTaxCode.charCodeAt(9)
}

function vi2en(str) {
  str = str ? str : ''
  str += ''
  return str.normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd').replace(/Đ/g, 'D');
}

exported.generateContainerBarcodeId = generateContainerBarcodeId
exported.convertFileName = convertFileName
exported.dateTimeFormat = dateTimeFormat
exported.dateTimeFormatVN = dateTimeFormatVN
exported.dateTimeFormatShort = dateTimeFormatShort
exported.dateFormat = dateFormat
exported.dateFormatVN = dateFormatVN
exported.dateTimeFormatHHMMSSDDMMYY = dateTimeFormatHHMMSSDDMMYY
exported.timeFormat = timeFormat
exported.padding = padding
exported.md5sum = md5sum
exported.formatMoney = formatMoney
exported.formatNumber = formatNumber
exported.encryptAES = encryptAES
exported.decryptAES = decryptAES
exported.fileSizeFormat = fileSizeFormat
exported.degreeToDMS = degreeToDMS
exported.unixTimeToTicks = unixTimeToTicks
exported.validateContNo = validateContNo
exported.validateTaxCode = validateTaxCode
exported.vi2en = vi2en