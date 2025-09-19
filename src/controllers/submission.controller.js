import { db } from "../libs/db.js";

export const getAllSubmission = async (req, res) => {
  try {
    const userId = req.user.id;

    const submissions = await db.submission.findMany({
      where: {
        userId: userId,
      },
    });

    res.status(200).json({
      success: true,
      message: "Submissions Fetched Successfully",
      submissions,
    })

  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "Error While Fetching Submissions",
    });
  }
};

export const getSubmissionsForProblem = async (req, res) => {
  try {
    const userId = req.user.id;
    const problemId = req.params.id;

    const submissions = await db.submission.findMany({
      where: {
        userId: userId,
        problemId: problemId,
      },
    });

    res.status(200).json({
      success: true,
      message: "Submission Fetched Successfully",
      submissions,
    })


  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "Error While Fetching Submissions",
    });
  }
};

export const getSubmissionsForProblemCount = async (req, res) => {
  try {
    const problemId = req.params.id;

    const submissions = await db.submission.count({
      where: {
        problemId: problemId,
      },
    });

    res.status(200).json({
      success: true,
      message: "Submission Count Fetched Successfully",
      submissions,
    })

  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "Error While Fetching Submission Count",
    });
  }
};

// // Get problems solved by user for a particular playlist
// export const getSubmissionsByUserForPlaylist = async (req, res) => {
//   try {
//     const { playlistId } = req.params;

//     // Fetch the playlist with problems
//     const playlist = await db.playlist.findUnique({
//       where: {
//         id: playlistId,
//         userId: req.user.id,
//       },
//       include: {
//         problems: {
//           include: {
//             problem: true,
//           },
//         },
//       },
//     });

//     if (!playlist) {
//       return res.status(404).json({
//         error: "Playlist not found",
//       });
//     }

//     // Filter problems to include only those solved by the user
//     const solvedProblems = playlist.problems.filter(
//       (p) => p.problem.solvedByUserIds?.includes(req.user.id)
//     );

//     res.status(200).json({
//       success: true,
//       message: "Solved problems fetched successfully",
//       solvedProblems,
//     });
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({
//       error: "Error while fetching playlist",
//     });
//   }
// };

// // Get all submissions for a particular playlist
// export const getAllSubmissionsForPlaylist = async (req, res) => {
//   try {
//     const { playlistId } = req.params;

//     // Fetch the playlist with problems
//     const playlist = await db.playlist.findUnique({
//       where: {
//         id: playlistId,
//         userId: req.user.id,
//       },
//       include: {
//         problems: {
//           include: {
//             problem: true,
//           },
//         },
//       },
//     });

//     if (!playlist) {
//       return res.status(404).json({
//         error: "Playlist not found",
//       });
//     }

//     res.status(200).json({
//       success: true,
//       message: "All submissions fetched successfully",
//       playlist,
//     });
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({
//       error: "Error while fetching playlist",
//     });
//   }
// };

// Get all submissions by the user for a particular playlist
export const getAllSubmissionsForPlaylist = async (req, res) => {
  try {
    const { playlistId } = req.params;

    // Get the playlist with problems (and make sure it belongs to the user)
    const playlist = await db.playlist.findUnique({
      where: {
        id: playlistId,
        userId: req.user.id,
      },
      include: {
        problems: {
          select: {
            problemId: true,
          },
        },
      },
    });

    if (!playlist) {
      return res.status(404).json({
        error: "Playlist not found",
      });
    }

    // Extract problem IDs from the playlist
    const problemIds = playlist.problems.map((p) => p.problemId);

    // Get all submissions by user for these problems
    const submissions = await db.submission.findMany({
      where: {
        userId: req.user.id,
        problemId: {
          in: problemIds,
        },
      },
      orderBy: {
        createdAt: "desc", // Optional: sort by latest
      },
    });

    res.status(200).json({
      success: true,
      message: "Submissions fetched successfully",
      submissions,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "Error while fetching submissions",
    });
  }
};
