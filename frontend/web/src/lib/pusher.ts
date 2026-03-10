import Pusher from "pusher-js";

const key = process.env.NEXT_PUBLIC_PUSHER_KEY;
const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER;

let client: Pusher | null = null;

export function getPusherClient() {
  if (typeof window === "undefined") return null;
  if (!key || !cluster) return null;

  if (!client) {
    client = new Pusher(key, {
      cluster,
    });
  }

  return client;
}

