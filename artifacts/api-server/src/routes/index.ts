import { Router, type IRouter } from "express";
import healthRouter from "./health";
import whopRouter from "./whop";
import visionRouter from "./vision";
import privacyRouter from "./privacy";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/whop", whopRouter);
router.use("/vision", visionRouter);
router.use(privacyRouter);

export default router;
