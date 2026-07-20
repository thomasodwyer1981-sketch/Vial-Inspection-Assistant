import { Router, type IRouter } from "express";
import healthRouter from "./health";
import whopRouter from "./whop";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/whop", whopRouter);

export default router;
