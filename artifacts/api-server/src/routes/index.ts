import { Router, type IRouter } from "express";
import healthRouter from "./health";
import partsRouter from "./parts";
import robotsRouter from "./robots";
import roomsRouter from "./rooms";
import leaderboardRouter from "./leaderboard";

const router: IRouter = Router();

router.use(healthRouter);
router.use(partsRouter);
router.use(robotsRouter);
router.use(roomsRouter);
router.use(leaderboardRouter);

export default router;
