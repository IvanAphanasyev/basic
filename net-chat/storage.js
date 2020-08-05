const ioredis = require("ioredis");

class Storage {
  constructor({ port = 6379, host = "127.0.0.1", password = null, db = 0 }) {
    const Redis = new ioredis(port, host, { db, password });
    Redis.pipeline()
      .flushdb()
      .exec()
      .then(([[err, result]]) => {
        console.log(`Clear storage: ${result}`);
      });
    this.redis = Redis;
  }
  async set(id, socket) {
    const string = JSON.stringify(socket);

    const [[err, result]] = await this.redis.pipeline().set(id, string).exec();
    if (err) throw err;
    return result;
  }
  async get(id) {
    const [[err, result]] = await this.redis.pipeline().get(id).exec();
    if (err) throw err;
    if (!result) throw new Error(`Storage reuturns null with key ${id}`);
    const socket = JSON.parse(result);
    return socket;
  }
  async del(id) {
    const [[err, result]] = await this.redis.pipeline().del(id).exec();

    if (err) throw err;
    return result;
  }

  async keys() {
    const [[err, result]] = await this.redis.pipeline().dbsize().exec();
    if (err) throw err;
    return result || 0;
  }
}
module.exports = Storage;
