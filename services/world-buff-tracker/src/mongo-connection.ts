import { MongoClient, type Db, type MongoClientOptions } from "mongodb";

/**
 * The bot's one MongoDB connection, shared by every store.
 *
 * Each store used to open its own client, and a client is not cheap: its own pool, its own
 * monitoring sockets, its own timers. Nineteen of them held ~70 server connections open for a
 * database of 5 MB, and on mongod every connection is a thread with its own buffers — most of the
 * database's memory was spent on connections, not data. One client with a small pool serves this
 * load (a handful of writes a minute) with a few sockets.
 */

export const MONGO_CLIENT_OPTIONS: MongoClientOptions = {
  // The busiest moment is a broadcast writing a few ledger rows at once; five is ample.
  maxPoolSize: 5,
  minPoolSize: 0,
  // Hand idle pooled sockets back instead of holding them open between bursts.
  maxIdleTimeMS: 60_000,
  // One polling monitor socket instead of a streaming monitor plus a separate RTT pinger.
  serverMonitoringMode: "poll",
};

export interface MongoConnection {
  readonly db: Db;
  /** Close the shared client. Called once, at shutdown, by whoever opened it. */
  close(): Promise<void>;
}

export async function connectMongo(uri: string, dbName: string): Promise<MongoConnection> {
  const client = new MongoClient(uri, MONGO_CLIENT_OPTIONS);
  await client.connect();
  return { db: client.db(dbName), close: () => client.close() };
}

/**
 * A store's `close` when it is backed by the shared connection: there is nothing of its own to
 * release, and closing the client from one store would pull it out from under all the others.
 */
export function releaseSharedClient(): Promise<void> {
  return Promise.resolve();
}
