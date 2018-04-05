const { formatUsd } = require('../utils');

module.exports = async ({ reply, redisClient, ctx }) => {
  const [
    tippedVia,
    tippedUsd,
    tippedCount,
    withdrawnVia,
    withdrawnUsd,
    withdrawnCount,
    introCount,
  ] = await Promise.all([
    redisClient.getAsync('stats.tipped.via'),
    redisClient.getAsync('stats.tipped.usd'),
    redisClient.getAsync('stats.tipped.count'),
    redisClient.getAsync('stats.withdrawn.via'),
    redisClient.getAsync('stats.withdrawn.usd'),
    redisClient.getAsync('stats.withdrawn.count'),
    redisClient.getAsync('stats.intros.count'),
  ]);

  // await ctx.maybeReplyFromStickerSet('stats');

  await reply(
    [
      `${introCount || 0} have introduced themselves to me`,
      `Users have tipped ${tippedCount || 0} times, totaling ${tippedVia ||
        0} VIA (${formatUsd(tippedUsd || 0)})`,
      `${withdrawnVia || 0} Via (${formatUsd(
        withdrawnUsd || 0
      )}) has been sent out in ${withdrawnCount || 0} withdraws`,
    ].join('\n')
  );
};
