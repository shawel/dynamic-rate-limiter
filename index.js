const Redis = require('ioredis');

class RateLimiter {
    constructor(env, endpoints, db) {
        env = env || 'local';
        this.redis = null;
        this.pipeline = nul;
        this.defaultRate = 100;
        this.expire = 120;
        if (env.match(/local/ig)) {
            redis = new Redis({
                port: endpoints[0].port,
                host: endpoints[0].host,
                db: db
            })
        } else {
            redis = new Redis({
                sentinels: endpoints,
                name: 'master',
                db: db
            })
        }
        this.pipeline = redis.pipeline();

        redis.on("error", function (err) {
            if (err) {
                throw err;
            }
        });

        redis.on("ready", function () {
            console.log("redis is ready");
        });
    }

    setDefaultRate(ratePerMin) {
        this.defaultRate = ratePerMin;
        return this;
    }

    async increase(userId) {
        let me = this;
        let currentKey = this.getCurrentKey(userId);
        return this.redis.hincrby(currentKey, 'tokens', 1).then(function (tokens) {
            if (tokens === 1) {
                me.pipeline().expire(currentKey, me.expire).hset(currentKey, 'rate', me.defaultRate).exec(function (err, results) {});
            }
            return tokens;
        });
    }

    setExpire(seconds) {
        this.expire = seconds;
        return this;
    }

    async setPlanRateForThisMinute(userId, rate) {
        let currentKey = this.getCurrentKey(userId);
        return this.redis.hincrby(currentKey, 'rate', rate).then(function (tokens) {
            return tokens;
        })
    }


    getCurrentKey(userId) {
        let d = new Date();
        return `${userId}-${d.getFullYear()}${d.getMonth()}${d.getDate()}${d.getHours()}${d.getMinutes()}`;
    }
}