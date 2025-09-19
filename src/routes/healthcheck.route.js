import express from "express";
import { healthCheck } from "../controllers/healthcheck.controller.js";

const healthcheckRoute = express.Router();

healthcheckRoute.get('/healthcheck', healthCheck);

export default healthcheckRoute;