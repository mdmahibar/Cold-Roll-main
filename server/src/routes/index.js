import { Router } from "express";
import healthRoutes from "./health.routes.js";
import sapRoutes from "./sap.routes.js";

const router = Router();

router.use("/health", healthRoutes);
router.use("/sap", sapRoutes);

export default router;
