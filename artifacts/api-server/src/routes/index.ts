import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import propertiesRouter from "./properties";
import billingRouter from "./billing";
import superadminRouter from "./superadmin";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/auth", authRouter);
router.use("/properties", propertiesRouter);
router.use("/billing", billingRouter);
router.use("/superadmin", superadminRouter);

export default router;
