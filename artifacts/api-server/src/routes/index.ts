import { Router, type IRouter } from "express";
import healthRouter from "./health";
import whopRouter from "./whop";
import visionRouter from "./vision";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/whop", whopRouter);
router.use("/vision", visionRouter);

export default router;
