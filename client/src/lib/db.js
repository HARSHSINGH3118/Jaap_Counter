 import { openDB } from "idb";

const DB_NAME = "jaap-db";
const VERSION = 1;
const QUEUE = "queue";
const META = "meta";

export const db = openDB(DB_NAME, VERSION, {
  upgrade(db) {
    if (!db.objectStoreNames.contains(QUEUE)) db.createObjectStore(QUEUE, { keyPath: "opId" });
    if (!db.objectStoreNames.contains(META)) db.createObjectStore(META);
  }
});

export async function enqueueEvent(evt) {
  return (await db).put(QUEUE, evt);
}
export async function getAllEvents() {
  return (await db).getAll(QUEUE);
}
export async function clearQueue() {
  return (await db).clear(QUEUE);
}
export async function requeue(events) {
  const d = await db;
  const tx = d.transaction(QUEUE, "readwrite");
  for (const e of events) await tx.store.put(e);
  await tx.done;
}
export async function queueCount() {
  return (await db).count(QUEUE);
}
export async function getSinceTs() {
  return (await db).get(META, "sinceTs");
}
export async function setSinceTs(ts) {
  return (await db).put(META, ts, "sinceTs");
}
