import { Router, type IRouter } from "express";
import healthRouter from "./health";
import partsRouter from "./parts";
import robotsRouter from "./robots";
import roomsRouter from "./rooms";
import leaderboardRouter from "./leaderboard";
import playersRouter from "./players";
import settingsRouter from "./settings";

const router: IRouter = Router();

router.use(healthRouter);
router.use(partsRouter);
router.use(robotsRouter);
router.use(roomsRouter);
router.use(leaderboardRouter);
router.use(playersRouter);
router.use(settingsRouter);

export default router;
