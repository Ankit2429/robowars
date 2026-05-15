import { EventEmitter } from "events";

export const globalEvents = new EventEmitter();

export const EVENTS = {
  MATCHMAKING_STATUS_CHANGED: "MATCHMAKING_STATUS_CHANGED",
  QUEUE_UPDATE: "QUEUE_UPDATE",
};
