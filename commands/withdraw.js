const {
  formatViaWithUsd,
  parseViaOrUsdAmount,
  withdraw,
  viaToUsd,
  getBalanceForUser,
} = require('../apis');
const { BalanceWouldBecomeNegativeError } = require('../errors');

module.exports = async ({
  message,
  reply,
  params,
  tipping,
  isPm,
  userId,
  fetchRpc,
  lockBitcoind,
  redisClient,
  ctx,
}) => {
  if (!isPm) {
    await reply('That command only works in a private message to me.');
    return;
  }

  if (params.length !== 2) {
    await reply(`I don't understand that. /withdraw <address> <via amount>`);
    return;
  }

  const [address, amountRaw] = params;

  const isWithdrawAll = amountRaw.toLowerCase() === 'all';

  const theirAmount = isWithdrawAll
    ? await getBalanceForUser(userId, { minConf: 1, fetchRpc })
    : await parseViaOrUsdAmount(amountRaw);

  if (!theirAmount) {
    await reply(
      `I don't understand that amount. Tell me the amount of VIA. /withdraw <address> <0.0001>`
    );
    return;
  }

  let actualAmount;

  try {
    const result = await withdraw(userId, address, theirAmount, {
      fetchRpc,
      lockBitcoind,
    });

    const { txid } = result;

    actualAmount = result.amount;

    const amountText = await formatViaWithUsd(actualAmount);
    const url = `https://explorer.viacoin.org/tx/${txid}`;

    await reply(`You withdrew ${amountText}: ${url}`);
  } catch (e) {
    if (e instanceof BalanceWouldBecomeNegativeError) {
      await ctx.maybeReplyFromStickerSet('insufficient-balance');
      await ctx.reply(`Your balance would become negative...`);
      return;
    } else {
      throw e;
    }
  }

  const usdAmount = await viaToUsd(actualAmount);

  await Promise.all([
    redisClient.incrbyfloatAsync('stats.withdrawn.via', actualAmount),
    redisClient.incrbyfloatAsync('stats.withdrawn.usd', usdAmount),
    redisClient.incrAsync('stats.withdrawn.count'),
  ]);
};
