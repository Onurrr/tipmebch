const { version } = require('../package.json');

module.exports = async ({ ctx, fetchRpc, userId, isPm, reply }) => {
  // await ctx.maybeReplyFromStickerSet('about');

  await reply(
    [
      `I'm a bot (v${version}) written by Andreas Brekken (@abrkn), modified by Mewnbot (@Belastingdienst) for tipping Viacoin (VIA) on Telegram`,
      'Try the /help command in a private message',
      `You can tip me and it'll go to the faucet once it's ready.`,
      `I'm open source: https://github.com/abrkn/tipmebch / https://github.com/onurrr/tipmevia`,
      `Report bugs here: https://github.com/onurrr/tipmevia/issues`,
      `The bot is not a wallet. Your funds will be lost if there are bugs`,
    ].join('\n')
  );
};
