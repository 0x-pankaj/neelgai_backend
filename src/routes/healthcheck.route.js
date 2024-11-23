

import { Router } from "express";
import{ verifyJWT} from "../middleware/auth.middleware.js";
import { healthCheck, health } from "../controllers/healthcheck.controller.js";  

const router = Router();

router.route("/").get(verifyJWT, healthCheck);
router.route("/health").get(health)

export default router;