import { db } from "../db";
import { z } from "zod";

// Zod validation schema for creating a contest
const createContestSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  startTime: z.string(),
  endTime: z.string(),
  status: z.enum(["UPCOMING", "LIVE", "COMPLETED"]),
  problems: z.array(z.object({ id: z.string().min(1) })),
});

const getAllContests = async (req, res) => {
  try {
    const contests = await db.contest.findMany({
      orderBy: { createdAt: "desc" },
    });
    res.status(200).json({ success: true, contests });
  } catch (error) {
    console.error("Error fetching contests:", error);
    res.status(500).json({ error: "Server Error" });
  }
};

const getContestById = async (req, res) => {
  try {
    const { id } = req.params;
    const contest = await db.contest.findUnique({
      where: { id },
      include: {
        problems: {
          orderBy: { order: "asc" },
          include: { problem: true },
        },
      },
    });

    if (!contest) return res.status(404).json({ error: "Contest not found" });
    res.status(200).json({ success: true, contest });
  } catch (error) {
    console.error("Error fetching contest by ID:", error);
    res.status(500).json({ error: "Server Error" });
  }
};

const createContest = async (req, res) => {
  try {
    const parsed = createContestSchema.safeParse(req.body);
    if (!parsed.success)
      return res.status(400).json({ error: parsed.error.errors });

    const { title, description, startTime, endTime, status, problems } =
      parsed.data;

    const existingContest = await db.contest.findFirst({
      where: { title, status: "LIVE" },
    });
    if (existingContest)
      return res.status(409).json({ error: "Contest already exists" });

    const startTimeDate = new Date(startTime);
    const endTimeDate = new Date(endTime);
    if (startTimeDate >= endTimeDate)
      return res
        .status(400)
        .json({ error: "End time must be after start time" });

    const contest = await db.contest.create({
      data: {
        title,
        description,
        startTime: startTimeDate,
        endTime: endTimeDate,
        status,
      },
    });

    await db.contestProblem.createMany({
      data: problems.map((p, index) => ({
        contestId: contest.id,
        problemId: p.id,
        order: index,
      })),
    });

    res.status(201).json({ success: true, contest });
  } catch (error) {
    console.error("Error creating contest:", error);
    res.status(500).json({ error: "Server Error" });
  }
};

const registerUserToContest = async (req, res) => {
  try {
    const { contestId } = req.params;
    const userId = req.user.id;

    const alreadyRegistered = await db.contestant.findUnique({
      where: { userId_contestId: { userId, contestId } },
    });

    if (alreadyRegistered)
      return res.status(409).json({ error: "Already registered" });

    const contestant = await db.contestant.create({
      data: { userId, contestId },
    });

    res.status(201).json({ success: true, contestant });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ error: "Server Error" });
  }
};

const unregisterUserFromContest = async (req, res) => {
  try {
    const { contestId } = req.params;
    const userId = req.user.id;

    const registered = await db.contestant.findUnique({
      where: { userId_contestId: { userId, contestId } },
    });

    if (!registered) return res.status(400).json({ error: "Not registered" });

    await db.contestant.delete({
      where: { userId_contestId: { userId, contestId } },
    });

    res
      .status(200)
      .json({ success: true, message: "Unregistered successfully" });
  } catch (error) {
    console.error("Unregister error:", error);
    res.status(500).json({ error: "Server Error" });
  }
};

const getContestLeaderboard = async (req, res) => {
  try {
    const { id } = req.params;

    const leaderboard = await db.contestant.findMany({
      where: { contestId: id },
      include: { user: { select: { id: true, username: true } } },
      orderBy: { score: "desc" },
    });

    res.status(200).json({ success: true, leaderboard });
  } catch (error) {
    console.error("Leaderboard error:", error);
    res.status(500).json({ error: "Server Error" });
  }
};

const createContestSubmission = async (req, res) => {
  try {
    const { contestId, userId, problemId, submissionId, score, timeTaken } =
      req.body;

    const exists = await db.contestSubmission.findFirst({
      where: { contestId, userId, problemId },
    });

    if (exists) return res.status(409).json({ error: "Already submitted" });

    const submission = await db.submission.findUnique({
      where: { id: submissionId },
    });

    if (!submission)
      return res.status(404).json({ error: "Submission not found" });

    const result = await db.contestSubmission.create({
      data: { contestId, userId, problemId, submissionId, score, timeTaken },
    });

    res.status(201).json({ success: true, result });
  } catch (error) {
    console.error("Create submission error:", error);
    res.status(500).json({ error: "Server Error" });
  }
};

const checkUserRegistration = async (req, res) => {
  try {
    const { contestId } = req.params;
    const userId = req.user.id;

    const registered = await db.contestant.findUnique({
      where: { userId_contestId: { userId, contestId } },
    });

    res.status(200).json({ success: true, registered: Boolean(registered) });
  } catch (error) {
    console.error("Registration check error:", error);
    res.status(500).json({ error: "Server Error" });
  }
};

export {
  createContest,
  getContestById,
  getContestLeaderboard,
  createContestSubmission,
  getAllContests,
  registerUserToContest,
  unregisterUserFromContest,
  checkUserRegistration,
};
