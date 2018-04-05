const bluebird = require('bluebird');
const assert = require('assert');
const Telegraf = require('telegraf');
const createViacoinRpc = require('./viacoinRpc');
const commands = require('./commands');
const { each } = require('lodash');
const redis = require('redis');
const debug = require('debug')('tipmevia');
const { printErrorAndExit } = require('panik');
const createIntro = require('./intro');
const createZombie = require('./zombie');
const { maybeReplyFromStickerSet } = require('./utils');
require('dotenv').config()

bluebird.promisifyAll(redis.RedisClient.prototype);
bluebird.promisifyAll(redis.Multi.prototype);

const {
  VIACOIND_URL,
  TELEGRAM_BOT_TOKEN,
  REDIS_URL = 'redis://localhost',
  NODE_ENV,
  STAFF_USER_ID,
  DEFAULT_STICKER_SET = 'pepe',
} = process.env;

assert(REDIS_URL, 'REDIS_URL');
assert(VIACOIND_URL, 'VIACOIND_URL');
assert(TELEGRAM_BOT_TOKEN, 'TELEGRAM_BOT_TOKEN');

const redisClient = redis.createClient(REDIS_URL);

const botUserId = TELEGRAM_BOT_TOKEN.split(/:/)[0];

const { fetchRpc, lockViacoind } = createViacoinRpc({
  viacoindUrl: VIACOIND_URL,
  redisClient,
});

const bot = new Telegraf(TELEGRAM_BOT_TOKEN);

bot.telegram.getMe().then(botInfo => {
  bot.options.username = botInfo.username;
});

bot.use(async (ctx, next) => {
  const stickerSet =
    (await redisClient.getAsync(
      `telegram.chat.settings:${ctx.chat.id}.sticker_set`
    )) || DEFAULT_STICKER_SET;

  // TODO: Migrate other properties into ctx
  Object.assign(ctx, {
    stickerSet,
    maybeReplyFromStickerSet: stickerName =>
      maybeReplyFromStickerSet(ctx, stickerSet, stickerName),
  });

  await next();
});

bot.use(createZombie());

bot.use(createIntro({ redisClient, fetchRpc, lockViacoind }));

const handleCommandError = (ctx, error) => {
  console.error(`Unhandled error when processing message`);
  console.error(ctx.message);
  console.error(error.stack);

  ctx.reply(`Something crashed and I'm not sure why. Sorry!`);

  if (NODE_ENV !== 'production') {
    ctx.reply(error.stack);
  }
};

const handleCommand = async (handler, ctx) => {
  const isPm = ctx.chat.id > 0;

  // TODO: Extract and use p-memoize. Maybe ctx contains admin status?
  const isAdmin =
    isPm ||
    (await ctx.getChat(ctx.chat.id)).all_members_are_administrators ||
    (await ctx
      .getChatAdministrators(ctx.chat.id)
      .then(admins => !!admins.find(_ => _.user.id === ctx.from.id)));

  return handler({
    ctx,
    fetchRpc,
    lockViacoind,
    userId: ctx.from.id.toString(),
    botUserId,
    username: ctx.from.username,
    isPm,
    isStaff: ctx.from.id === +STAFF_USER_ID,
    isAdmin,
    reply: _ => ctx.reply(_),
    params:
      console.log(ctx.message) ||
      ctx.message.text
        .split(' ')
        .slice(1)
        .filter(_ => _.length),
    redisClient,
  });
};

each(commands, (handler, name) => {
  debug(`Registering command, ${name}`);

  bot.command(name, ctx =>
    handleCommand(handler, ctx).catch(error => handleCommandError(ctx, error))
  );
});

bot.startPolling();
