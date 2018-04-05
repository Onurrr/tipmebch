const { formatConfirmedAndUnconfirmedBalances } = require('../apis');
const { getBalanceForUser, viaToUsd } = require('../apis');
const { n } = require('../utils');
const stickers = require('../stickers');
const { sample, findLast } = require('lodash');

const getBalanceSticker = (setName, usdBalance) => {
  const set = stickers[setName];
  if (!set) {
    return null;
  }

  const levels = set.balance;
  if (!levels || !levels.length) {
    return null;
  }

  const level = findLast(
    levels,
    ([minUsdBalance]) => usdBalance >= minUsdBalance
  );
  if (!level) {
    return null;
  }

  const [, levelStickers] = level;

  return sample(levelStickers);
};

module.exports = async ({ ctx, userId, fetchRpc }) => {
  const confirmed = await getBalanceForUser(userId, { fetchRpc });

  const unconfirmed = await getBalanceForUser(userId, {
    minConf: 0,
    fetchRpc,
  });

  const asText = await formatConfirmedAndUnconfirmedBalances(
    confirmed,
    unconfirmed
  );

  const asUsd = await viaToUsd(
    n(confirmed)
      .plus(unconfirmed)
      .toNumber()
  );

  await ctx.reply(`Balance: ${asText}`, { parse_mode: 'markdown' });

  const stickerId = getBalanceSticker(ctx.stickerSet, asUsd);

  if (stickerId) {
    await ctx.replyWithSticker(stickerId);
  }
};
