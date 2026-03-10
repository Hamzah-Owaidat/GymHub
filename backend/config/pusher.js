const Pusher = require('pusher');

/**
 * Shared Pusher Channels instance.
 *
 * Configuration is read from environment variables:
 * - PUSHER_APP_ID
 * - PUSHER_KEY
 * - PUSHER_SECRET
 * - PUSHER_CLUSTER
 *
 * Never commit secrets directly to the repository – keep them in .env.
 */

const {
  PUSHER_APP_ID,
  PUSHER_KEY,
  PUSHER_SECRET,
  PUSHER_CLUSTER,
} = process.env;

let pusher = null;

if (PUSHER_APP_ID && PUSHER_KEY && PUSHER_SECRET && PUSHER_CLUSTER) {
  pusher = new Pusher({
    appId: PUSHER_APP_ID,
    key: PUSHER_KEY,
    secret: PUSHER_SECRET,
    cluster: PUSHER_CLUSTER,
    useTLS: true,
  });
}

module.exports = pusher;

