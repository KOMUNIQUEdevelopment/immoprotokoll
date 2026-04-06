import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import propertiesRouter from "./properties";
import protocolsRouter from "./protocols";
import billingRouter from "./billing";
import superadminRouter from "./superadmin";
import { supportPublicRouter, supportAdminRouter } from "./support";
import { roadmapPublicRouter, roadmapAdminRouter } from "./roadmap";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/auth", authRouter);
router.use("/properties", propertiesRouter);
router.use("/protocols", protocolsRouter);
router.use("/billing", billingRouter);
router.use("/superadmin", superadminRouter);
router.use("/support", supportPublicRouter);
router.use("/superadmin/support", supportAdminRouter);
router.use("/roadmap", roadmapPublicRouter);
router.use("/superadmin/roadmap", roadmapAdminRouter);

export default router;
