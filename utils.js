const assert = require('assert');
const via = require('viacore-lib');
const numeral = require('numeral');
const qr = require('qr-image');
const BigNumber = require('bignumber.js');
const { sample } = require('lodash');
const stickers = require('./stickers');

const THREE_TICKS = '```';

exports.formatNumber = (value, format) => numeral(value).format(format);

const printError = (...args) => console.error(...args);
exports.printError = printError;

exports.formatVia = _ => {
  if (+_ < 1) {
    return _.toString()+" VIA"; 
  }

  return `${numeral(_.toString()).format('0,0[.00000000]')} VIA`;
};

exports.formatUsd = _ => {
  if (+_ < 0.01) {
    return '< $0.01';
  }

  return `$` + numeral(_.toString()).format('0,0.00');
};

exports.swallowError = e => {
  printError(e.stack);
  return 'Error';
};

exports.randomIntFromInterval = (min, max) =>
  Math.floor(Math.random() * (max - min + 1) + min);

exports.createQrCode = text =>
  new Promise((resolve, reject) => {
    resolve(qr.imageSync(text, { size: 7 }));
  });

const n = (..._) => new BigNumber(..._);

const isValidTelegramUserIdFormat = _ => {
  console.log(_);
  return typeof _ === 'string' && _.match(/^[0-9]+$/);
};

exports.isValidTelegramUserIdFormat = isValidTelegramUserIdFormat;

exports.extractUserDiscordIdFromTag = _ => {
  const match = _.match(/^<@!?([0-9]+)>$/);
  if (!match) {
    return null;
  }
  return match[1];
};

const VIACOIN_BASE58_ADDRESS_REGEX = /^[V][a-km-zA-HJ-NP-Z1-9]{25,34}$/;

exports.internalViaAddressToStandard = (address, withPrefix = false) => {
  assert(address.match(VIACOIN_BASE58_ADDRESS_REGEX));

  const viaAddress = new via.Address(address);
  return viaAddress.toString(via.Address.CashAddrFormat);
};

exports.viaAddressToInternal = address => {
  if (address.match(VIACOIN_BASE58_ADDRESS_REGEX)) {
    return address;
  }

  const viaAddress = via.Address.fromString(
    address,
    'livenet',
    'pubkeyhash',
    via.Address.CashAddrFormat
  );
  return viaAddress.toString(via.Address.LegacyFormat);
};

const getUserAccount = id => `telegram-${id}`;

const hasTooManyDecimalsForSats = (value, decimals) =>
  !n(n(value).toFixed(8)).eq(n(value));

exports.getAddressForUser = async (userId, { fetchRpc }) => {
  console.log('wat', userId, typeof userId);
  assert(isValidTelegramUserIdFormat(userId));
  return await fetchRpc('getaccountaddress', [getUserAccount(userId)]);
};

const maybeReplyFromStickerSet = (ctx, setName, stickerName) => {
  const set = stickers[setName];
  assert(set, `Sticker set ${setName} not found`);

  const variants = set[stickerName];

  const stickerId = sample(variants);
  if (!stickerId) {
    return;
  }

  return ctx.replyWithSticker(stickerId);
};

Object.assign(exports, {
  THREE_TICKS,
  hasTooManyDecimalsForSats,
  n,
  maybeReplyFromStickerSet,
});

exports.getUserAccount = getUserAccount;
