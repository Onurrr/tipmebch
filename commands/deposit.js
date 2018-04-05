const assert = require('assert');
const debug = require('debug')('tipmevia');
const {
  createQrCode,
  internalViaAddressToStandard,
  getAddressForUser,
} = require('../utils');

module.exports = async ({ ctx, fetchRpc, userId, isPm, reply }) => {
  if (!isPm) {
    console.log({ isPm });
    await reply('That command only works in a private message to me.');
    return;
  }

  debug(`Looking up deposit address for ${userId}`);

  const legacyAddress = await getAddressForUser(userId, {
    fetchRpc,
  });

  assert(legacyAddress.match(/^[V][a-km-zA-HJ-NP-Z1-9]{25,34}$/));

  const address = internalViaAddressToStandard(legacyAddress, true);
  const qr = await createQrCode(address);

  console.log(typeof qr, Buffer.isBuffer(qr));

  await ctx.replyWithMediaGroup([
    {
      media: { source: qr },
      type: 'photo',
      caption: `Scan this QR code to deposit`,
    },
  ]);

  await ctx.reply(`To deposit Viacoin (VIA), send to: ${address}`);
};
