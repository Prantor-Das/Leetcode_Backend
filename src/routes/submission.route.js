import express from 'express';
import { getAllSubmission, getSubmissionsForProblem, getSubmissionsForProblemCount } from "../controllers/submission.controller.js";
import { isLoggedIn } from "../middleware/auth.middleware.js";

const submissionRoute = express.Router();

submissionRoute.get("/get-all-submission", isLoggedIn, getAllSubmission);
submissionRoute.get("/get-submission/:problemId", isLoggedIn, getSubmissionsForProblem);
submissionRoute.get("/get-submission-count/:problemId", isLoggedIn, getSubmissionsForProblemCount);

export default submissionRoute;