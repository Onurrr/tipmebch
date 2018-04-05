const assert = require('assert');
const { formatViaWithUsd, transfer } = require('../apis');
const debug = require('debug')('tipmevia');

module.exports = async ({
  ctx,
  fetchRpc,
  userId,
  isPm,
  reply,
  redisClient,
  username,
  params,
  lockViacoind,
}) => {
  if (params.length !== 1) {
    await reply(
      `I don't understand this command. I expected "/undo <identifier>"`
    );
    return;
  }

  const [unclaimedId] = params;

  assert(unclaimedId.match(/^[a-z0-9_-]+$/i), `Bad id. ${unclaimedId}`);

  const unclaimed = await redisClient
    .getAsync(`telegram.unclaimed.${unclaimedId}`)
    .then(JSON.parse);

  if (!unclaimed) {
    debug(`Can't find claim with id ${unclaimedId}`);
    return await reply('Claim not found');
  }

  debug('Unclaimed, %O', unclaimed);

  const {
    senderUserId,
    chatId,
    viaAmount,
    receiverUsername,
    senderUsername,
  } = unclaimed;

  if (senderUserId !== ctx.from.id) {
    debug(
      `Unclaimed sender, ${senderUserId}, not same as message sender, ${
        ctx.from.id
      }`
    );
    return await reply('Claim not found');
  }

  await redisClient
    .multi()
    .del(`telegram.unclaimed.${unclaimedId}`)
    .lrem(`telegram.unclaimed.received:${username}`, 0, unclaimedId)
    .execAsync();

  if (!unclaimed) {
    debug(`Can't find claim with id ${unclaimedId}`);
    return await reply('Claim not found');
  }

  // TODO: Tip counter does not decrease

  const actualAmount = await transfer(
    `telegram-unclaimed-${unclaimedId}`,
    senderUserId.toString(),
    viaAmount,
    {
      fetchRpc,
      lockViacoind,
      redisClient,
    }
  );

  const amountText = await formatViaWithUsd(actualAmount);

  try {
    await ctx.telegram.sendMessage(
      chatId,
      `@${senderUsername} has reversed a ${amountText} tip meant for @${receiverUsername}`
    );
  } catch (error) {
    console.warn(
      `WARN: Failed to tell user about their reversal:\n${error.message}`
    );
  }
};
