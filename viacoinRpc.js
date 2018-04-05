const assert = require('assert');
const superagent = require('superagent');
const Redlock = require('redlock');

const createViacoinRpc = ({ redisClient, say, viacoindUrl }) => {
  assert(redisClient, 'redisClient is required');
  assert(viacoindUrl, 'viacoindUrl is required');

  const redlock = new Redlock([redisClient]);
  const lockViacoind = () =>
    redlock.lock(`locks.viacoind.${viacoindUrl}.lock`, 10e3);

  let fetchRpcCounter = 1;

  const fetchRpc = (method, params) =>
    superagent
      .post(viacoindUrl)
      .send({ id: (++fetchRpcCounter).toString(), method, params })
      .then(_ => {
        const { result, error } = _.body;
        if (error) {
          throw new Error(error);
        }
        return result;
      });

  return {
    fetchRpc,
    lockViacoind,
  };
};

module.exports = createViacoinRpc;
