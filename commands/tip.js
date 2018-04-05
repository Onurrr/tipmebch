const shortid = require('shortid');
const {
  formatViaWithUsd,
  transfer,
  viaToUsd,
  parseViaOrUsdAmount,
} = require('../apis');
const { BalanceWouldBecomeNegativeError } = require('../errors');
const debug = require('debug')('tipmevia');

module.exports = async ({
  ctx,
  params,
  username,
  reply,
  redisClient,
  userId,
  fetchRpc,
  lockBitcoind,
}) => {
  if (params.length !== 2) {
    await reply(
      `I don't understand this command. I expected "/tip 0.01 @username" or "/tip $1 @username"`
    );
    await ctx.maybeReplyFromStickerSet('confused');
    return;
  }

  const [amountRaw, toUserRaw] = params;

  const toUserMatch = toUserRaw.match(/^@([a-z0-9_]+)$/i);

  if (!toUserMatch) {
    console.warn(`Invalid username format for ${toUserRaw}`);
    await reply(
      `That username format is invalid. I'm expecting /tip $1 @SomeUserName`
    );
    await ctx.maybeReplyFromStickerSet('confused');
    return;
  }

  const toUsername = toUserMatch[1];

  const toUserId = await redisClient.getAsync(`telegram.user.${toUsername}`);
  const userIsKnown = !!toUserId;

  const viaAmount = await parseViaOrUsdAmount(amountRaw);

  if (!viaAmount) {
    await reply(
      `I don't understand the amount. I expected "/tip 0.01 @username" or "/tip $1 @username"`
    );
    await ctx.maybeReplyFromStickerSet('confused');
    return;
  }

  debug('User is known? %s', userIsKnown);

  let actualAmount;
  let bitcoinAccountId;
  let unclaimedId;

  if (userIsKnown) {
    bitcoinAccountId = toUserId;
  } else {
    unclaimedId = shortid.generate();
    bitcoinAccountId = `telegram-unclaimed-${unclaimedId}`;

    const unclaimedKey = `telegram.unclaimed.${unclaimedId}`;

    const unclaimed = {
      bitcoinAccountId,
      senderUserId: +userId,
      chatId: ctx.chat.id,
      viaAmount,
      receiverUsername: toUsername,
      senderUsername: username,
    };

    debug(
      `Receiver ${toUsername} is not known. Storing funds in %O`,
      unclaimed
    );

    await redisClient.rpushAsync(
      `telegram.unclaimed.received:${toUsername}`,

      unclaimedId
    );

    await redisClient.setAsync(unclaimedKey, JSON.stringify(unclaimed));
  }

  try {
    actualAmount = await transfer(userId, bitcoinAccountId, viaAmount, {
      fetchRpc,
      lockBitcoind,
      redisClient,
    });
  } catch (e) {
    if (e instanceof BalanceWouldBecomeNegativeError) {
      await ctx.maybeReplyFromStickerSet('insufficient-balance');
      await ctx.reply(`Your balance would become negative...`);
      return;
    } else {
      throw e;
    }
  }

  const amountText = await formatViaWithUsd(actualAmount);

  await reply(`You tipped ${amountText} to ${toUserRaw}!`);

  if (!userIsKnown) {
    await reply(
      `@${toUsername} needs to claim the tip by saying /claim. @${username} can reverse the tip with "/undo ${unclaimedId}" until then`
    );
  }

  const usdAmount = await viaToUsd(actualAmount);

  await Promise.all([
    redisClient.incrbyfloatAsync('stats.tipped.via', actualAmount),
    redisClient.incrbyfloatAsync('stats.tipped.usd', usdAmount),
    redisClient.incrAsync('stats.tipped.count'),
  ]);
};
