import express from "express";
import { checkAdmin, isLoggedIn } from "../middleware/auth.middleware.js";
import { createProblem, deleteProblem, getAllProblem, getAllProblemaSolvedByUser, getProblemById, updateProblem } from "../controllers/problem.controller.js";

const problemRoutes = express.Router();

problemRoutes.post("/create-problem", isLoggedIn,checkAdmin, createProblem)
problemRoutes.get("/get-all-problem", isLoggedIn, getAllProblem)
problemRoutes.get("/get-problem/:id", isLoggedIn, getProblemById)
problemRoutes.put("/update-problem/:id", isLoggedIn, checkAdmin, updateProblem)
problemRoutes.delete("/delete-problem/:id", isLoggedIn, checkAdmin, deleteProblem)
problemRoutes.get("/get-solved-problem", isLoggedIn, getAllProblemaSolvedByUser)


export default problemRoutes;