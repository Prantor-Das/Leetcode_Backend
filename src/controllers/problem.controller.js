import { db } from "../libs/db.js";
import {
  getJudge0LanguageId,
  pollBatchResults,
  submitBatch,
} from "../libs/judge0.lib.js";

export const createProblem = async (req, res) => {
  // going to get all the data from the request body
  const {
    title,
    description,
    difficulty,
    tags,
    examples,
    constraints,
    testcases,
    codeSnippets,
    referenceSolutions,
  } = req.body;

  // loop through each reference solution for differnt problem
  // Object.entries(referenceSolutions) is an array of [language, solutionCode]
  // Object.entries is a method that returns an array of [key, value]
  try {
    for (const [language, solutionCode] of Object.entries(referenceSolutions)) {
      const languageId = getJudge0LanguageId(language);

      if (!languageId) {
        return res
          .status(400)
          .json({ error: `Language ${language} is not supported` });
      }

      const submissions = testcases.map(({ input, output }) => ({
        source_code: solutionCode,
        language_id: languageId,
        stdin: input,
        expected_output: output,
      }));

      const submissionResults = await submitBatch(submissions);

      const tokens = submissionResults.map((res) => res.token);

      const results = await pollBatchResults(tokens);

      for (let i = 0; i < results.length; i++) {
        const result = results[i];

        console.log("Result-----", result);

        console.log(
          `Testcase ${
            i + 1
          } and Language ${language} ----- result ${JSON.stringify(
            result.status.description
          )}`
        );

        if (result.status.id !== 3) {
          return res.status(400).json({
            error: `Testcase ${i + 1} failed for language ${language}`,
          });
        }
      }
    }

    // save the problem in the database
    const newProblem = await db.problem.create({
      data: {
        title,
        description,
        difficulty,
        tags,
        examples,
        constraints,
        testcases,
        codeSnippets,
        referenceSolutions,
        userId: req.user.id,
      },
    });

    return res.status(201).json({
      success: true,
      message: "Problem created successfully",
      problem: newProblem,
    });
  } catch (error) {
    console.error("Create problem error:", error);
    return res.status(500).json({
      success: false,
      message: "Error creating problem",
    });
  }
};

export const getAllProblem = async (req, res) => {
  try {
    const problems = await db.problem.findMany(
      {
        include:{
          solvedBy: {
            where: {
              userId: req.user.id
            }
          }
        }
      }
    );

    if (!problems) {
      return res.status(404).json({
        error: "No Problems Found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Problems Fetched Successfully",
      problems,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Error While Fetching Problems",
    });
  }
};

// // Get unique problems for the user (from enrolled playlists and own problems)
// export const getUniqueProblemsForUser = async (req, res) => {
//   try {
//     const userId = req.user.id;

//     // Get all enrolled playlists
//     const enrolledPlaylists = await db.enrolledPlaylist.findMany({
//       where: {
//         userId: userId
//       },
//       include: {
//         problems: {
//           include: {
//             problem: {
//               include: {
//                 solvedBy: {
//                   where: {
//                     userId: userId
//                   }
//                 }
//               }
//             }
//           }
//         }
//       }
//     });

//     // Get all problems from enrolled playlists
//     const enrolledProblems = [];
//     enrolledPlaylists.forEach(playlist => {
//       playlist.problems.forEach(problemEntry => {
//         enrolledProblems.push(problemEntry.problem);
//       });
//     });

//     // // Get user's own problems
//     // const userProblems = await db.problem.findMany({
//     //   where: {
//     //     userId: userId
//     //   },
//     //   include: {
//     //     solvedBy: {
//     //       where: {
//     //         userId: userId
//     //       }
//     //     }
//     //   }
//     // });

//     // // Combine and deduplicate by title
//     // const allProblems = [...enrolledProblems, ...userProblems];
//     const allProblems = [...enrolledProblems];
//     const uniqueProblemsMap = new Map();

//     allProblems.forEach(problem => {
//       if (!uniqueProblemsMap.has(problem.title)) {
//         uniqueProblemsMap.set(problem.title, problem);
//       }
//     });

//     const uniqueProblems = Array.from(uniqueProblemsMap.values());

//     res.status(200).json({
//       success: true,
//       message: "Unique Problems Fetched Successfully",
//       problems: uniqueProblems,
//     });
//   } catch (error) {
//     console.error(error);
//     return res.status(500).json({
//       success: false,
//       message: "Error While Fetching Unique Problems",
//     });
//   }
// };

export const getProblemById = async (req, res) => {
  const { id } = req.params;

  try {
    const problem = await db.problem.findUnique({
      where: {
        id,
      },
    });

    if (!problem) {
      return res.status(404).json({
        error: "Problem not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Problem Fetched Successfully",
      problem,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Error While Fetching Problem by id",
    });
  }
};

export const updateProblem = async (req, res) => {
  // going to get problem id
  const { id } = req.params;

  // going to get all the data from the request body
  const {
    title,
    description,
    difficulty,
    tags,
    examples,
    constraints,
    testcases,
    codeSnippets,
    referenceSolutions,
  } = req.body;

  const problem = await db.problem.findUnique({ where: { id } });

  if (!problem) {
    return res.status(404).json({ error: "Problem not found" });
  }

  // Check if user owns the problem
  if (problem.userId !== req.user.id) {
    return res.status(403).json({ error: "You are not authorized to update this problem" });
  }

  // loop through each reference solution for differnt problem
  try {
    for (const [language, solutionCode] of Object.entries(referenceSolutions)) {
      const languageId = getJudge0LanguageId(language);

      if (!languageId) {
        return res
          .status(400)
          .json({ error: `Language ${language} is not supported` });
      }

      const submissions = testcases.map(({ input, output }) => ({
        source_code: solutionCode,
        language_id: languageId,
        stdin: input,
        expected_output: output,
      }));

      const submissionResults = await submitBatch(submissions);

      const tokens = submissionResults.map((res) => res.token);

      const results = await pollBatchResults(tokens);

      for (let i = 0; i < results.length; i++) {
        const result = results[i];

        console.log("Result-----", result);

        console.log(
          `Testcase ${
            i + 1
          } and Language ${language} ----- result ${JSON.stringify(
            result.status.description
          )}`
        );

        if (result.status.id !== 3) {
          return res.status(400).json({
            error: `Testcase ${i + 1} failed for language ${language}`,
          });
        }
      }
    }

    // update the problem in the database
    const updatedProblem = await db.problem.update({
      where: { id },
      data: {
        title,
        description,
        difficulty,
        tags,
        examples,
        constraints,
        testcases,
        codeSnippets,
        referenceSolutions,
      },
    });

    return res.status(200).json({
      success: true,
      message: "Problem updated successfully",
      problem: updatedProblem,
    });
  } catch (error) {
    console.error("Update problem error:", error);
    return res.status(500).json({
      success: false,
      message: "Error updating problem",
    });
  }
};

export const deleteProblem = async (req, res) => {
  const { id } = req.params;

  try {
    const problem = await db.problem.findUnique({
      where: {
        id,
      },
    });

    if (!problem) {
      return res.status(404).json({
        error: "Problem not found",
      });
    }

    // Check if user owns the problem
    if (problem.userId !== req.user.id) {
      return res.status(403).json({ 
        error: "You are not authorized to delete this problem" 
      });
    }

    await db.problem.delete({
      where: {
        id,
      },
    });

    res.status(200).json({
      success: true,
      message: "Problem deleted successfully",
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Error while deleting problem",
    });
  }
};

export const getAllProblemaSolvedByUser = async (req, res) => {
  try {
    const problems = await db.problem.findMany({
      where: {
        solvedBy: {
          some: {
            userId: req.user.id,
          }, // if any one is true use some
        },
      },
      include: { // include is used to fetch the data from the currently logged in user
        solvedBy: {
          where: {
            userId: req.user.id
          }
        },
      }
    });

    // console.log(problems);

    res.status(200).json({
      success: true,
      message: "Problems Fetched Successfully",
      problems,
    })
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "Error While Fetching Problems",
    });
  }
};

// Mark problem as solved and update across all playlists with same title
export const markProblemAsSolved = async (req, res) => {
  const { problemId } = req.params;
  const userId = req.user.id;

  try {
    // Check if problem exists
    const problem = await db.problem.findUnique({
      where: { id: problemId }
    });

    if (!problem) {
      return res.status(404).json({
        error: "Problem not found",
      });
    }

    // Check if already solved
    const existingSolution = await db.problemSolved.findUnique({
      where: {
        userId_problemId: {
          userId,
          problemId
        }
      }
    });

    if (existingSolution) {
      return res.status(200).json({
        success: true,
        message: "Problem already marked as solved",
      });
    }

    // Mark as solved
    await db.problemSolved.create({
      data: {
        userId,
        problemId
      }
    });

    // Find all problems with the same title and mark them as solved too
    const similarProblems = await db.problem.findMany({
      where: {
        title: problem.title,
        id: {
          not: problemId
        }
      }
    });

    // Mark all similar problems as solved
    for (const similarProblem of similarProblems) {
      await db.problemSolved.upsert({
        where: {
          userId_problemId: {
            userId,
            problemId: similarProblem.id
          }
        },
        update: {},
        create: {
          userId,
          problemId: similarProblem.id
        }
      });
    }

    res.status(200).json({
      success: true,
      message: "Problem marked as solved across all playlists",
      affectedProblems: similarProblems.length + 1
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "Error marking problem as solved",
    });
  }
};

// Get problems from a specific enrolled playlist
export const getProblemsFromEnrolledPlaylist = async (req, res) => {
  const { enrolledPlaylistId } = req.params;
  const userId = req.user.id;

  try {
    // Check if user owns the enrolled playlist
    const enrolledPlaylist = await db.enrolledPlaylist.findFirst({
      where: {
        id: enrolledPlaylistId,
        userId: userId
      },
      include: {
        problems: {
          include: {
            problem: {
              include: {
                solvedBy: {
                  where: {
                    userId: userId
                  }
                }
              }
            }
          }
        }
      }
    });

    if (!enrolledPlaylist) {
      return res.status(404).json({
        error: "Enrolled playlist not found or you don't have access",
      });
    }

    const problems = enrolledPlaylist.problems.map(p => p.problem);

    res.status(200).json({
      success: true,
      message: "Enrolled playlist problems fetched successfully",
      playlist: {
        id: enrolledPlaylist.id,
        name: enrolledPlaylist.name,
        description: enrolledPlaylist.description,
        enrolledAt: enrolledPlaylist.enrolledAt
      },
      problems,
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "Error fetching enrolled playlist problems",
    });
  }
};

// Get user's progress across all enrolled playlists
export const getUserProgress = async (req, res) => {
  try {
    const userId = req.user.id;

    const enrolledPlaylists = await db.enrolledPlaylist.findMany({
      where: {
        userId: userId
      },
      include: {
        problems: {
          include: {
            problem: {
              include: {
                solvedBy: {
                  where: {
                    userId: userId
                  }
                }
              }
            }
          }
        }
      }
    });

    const progress = enrolledPlaylists.map(playlist => {
      const totalProblems = playlist.problems.length;
      const solvedProblems = playlist.problems.filter(
        p => p.problem.solvedBy.length > 0
      ).length;

      return {
        enrolledPlaylistId: playlist.id,
        originalPlaylistId: playlist.originalPlaylistId,
        playlistName: playlist.name,
        totalProblems,
        solvedProblems,
        progressPercentage: totalProblems > 0 ? (solvedProblems / totalProblems) * 100 : 0,
        enrolledAt: playlist.enrolledAt
      };
    });

    res.status(200).json({
      success: true,
      message: "User progress fetched successfully",
      progress,
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "Error fetching user progress",
    });
  }
};

// Get problems by difficulty from user's enrolled playlists
export const getProblemsByDifficulty = async (req, res) => {
  const { difficulty } = req.params;
  const userId = req.user.id;

  try {
    // Validate difficulty
    if (!['EASY', 'MEDIUM', 'HARD'].includes(difficulty.toUpperCase())) {
      return res.status(400).json({
        error: "Invalid difficulty level",
      });
    }

    const enrolledPlaylists = await db.enrolledPlaylist.findMany({
      where: {
        userId: userId
      },
      include: {
        problems: {
          include: {
            problem: {
              where: {
                difficulty: difficulty.toUpperCase()
              },
              include: {
                solvedBy: {
                  where: {
                    userId: userId
                  }
                }
              }
            }
          }
        }
      }
    });

    // Extract problems and deduplicate by title
    const problemsMap = new Map();
    enrolledPlaylists.forEach(playlist => {
      playlist.problems.forEach(problemEntry => {
        if (problemEntry.problem && !problemsMap.has(problemEntry.problem.title)) {
          problemsMap.set(problemEntry.problem.title, problemEntry.problem);
        }
      });
    });

    const problems = Array.from(problemsMap.values());

    res.status(200).json({
      success: true,
      message: `${difficulty} problems fetched successfully`,
      problems,
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "Error fetching problems by difficulty",
    });
  }
};

// Get dashboard statistics for the user
export const getDashboardStats = async (req, res) => {
  try {
    const userId = req.user.id;

    // Get total enrolled playlists
    const totalEnrolledPlaylists = await db.enrolledPlaylist.count({
      where: {
        userId: userId
      }
    });

    // Get total problems from enrolled playlists (unique by title)
    const enrolledPlaylists = await db.enrolledPlaylist.findMany({
      where: {
        userId: userId
      },
      include: {
        problems: {
          include: {
            problem: true
          }
        }
      }
    });

    const uniqueProblems = new Set();
    enrolledPlaylists.forEach(playlist => {
      playlist.problems.forEach(problemEntry => {
        uniqueProblems.add(problemEntry.problem.title);
      });
    });

    const totalProblems = uniqueProblems.size;

    // Get total solved problems
    const totalSolvedProblems = await db.problemSolved.count({
      where: {
        userId: userId
      }
    });

    // Get problems by difficulty
    const problemsByDifficulty = {
      EASY: 0,
      MEDIUM: 0,
      HARD: 0
    };

    const solvedByDifficulty = {
      EASY: 0,
      MEDIUM: 0,
      HARD: 0
    };

    enrolledPlaylists.forEach(playlist => {
      playlist.problems.forEach(problemEntry => {
        const problem = problemEntry.problem;
        if (uniqueProblems.has(problem.title)) {
          problemsByDifficulty[problem.difficulty]++;
        }
      });
    });

    // Get solved problems by difficulty
    const solvedProblems = await db.problemSolved.findMany({
      where: {
        userId: userId
      },
      include: {
        problem: true
      }
    });

    const solvedTitles = new Set();
    solvedProblems.forEach(solved => {
      if (!solvedTitles.has(solved.problem.title)) {
        solvedTitles.add(solved.problem.title);
        solvedByDifficulty[solved.problem.difficulty]++;
      }
    });

    res.status(200).json({
      success: true,
      message: "Dashboard statistics fetched successfully",
      stats: {
        totalEnrolledPlaylists,
        totalProblems,
        totalSolvedProblems: solvedTitles.size,
        problemsByDifficulty,
        solvedByDifficulty,
        overallProgress: totalProblems > 0 ? (solvedTitles.size / totalProblems) * 100 : 0
      }
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "Error fetching dashboard statistics",
    });
  }
};