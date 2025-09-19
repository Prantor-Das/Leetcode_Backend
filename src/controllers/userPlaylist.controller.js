import { db } from "../libs/db.js";

// Get all user's personal playlists
export const getUserPlaylists = async (req, res) => {
  try {
    const userId = req.user.id;

    const playlists = await db.playlist.findMany({
      where: {
        userId,
        isAdminPlaylist: false,
      },
      include: {
        problems: {
          include: {
            problem: {
              select: {
                id: true,
                title: true,
                difficulty: true,
                tags: true,
              },
            },
          },
        },
      },
    });

    res.status(200).json({
      success: true,
      message: "User playlists fetched successfully",
      playlists,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "Error while fetching user playlists",
    });
  }
};

// Get all enrolled playlists
export const getEnrolledPlaylists = async (req, res) => {
  try {
    const userId = req.user.id;

    const enrolledPlaylists = await db.enrolledPlaylist.findMany({
      where: {
        userId,
      },
      include: {
        originalPlaylist: {
          select: {
            id: true,
            name: true,
            description: true,
            visibility: true,
            user: {
              select: {
                username: true,
              },
            },
          },
        },
        problems: {
          include: {
            problem: {
              select: {
                id: true,
                title: true,
                difficulty: true,
                tags: true,
              },
            },
          },
        },
      },
    });

    // Get solve status for each problem
    const enrichedPlaylists = await Promise.all(
      enrolledPlaylists.map(async (playlist) => {
        const problemIds = playlist.problems.map(p => p.problemId);
        
        const solvedProblems = await db.problemSolved.findMany({
          where: {
            userId,
            problemId: { in: problemIds },
          },
        });

        const solvedProblemIds = new Set(solvedProblems.map(sp => sp.problemId));
        
        const problemsWithStatus = playlist.problems.map(p => ({
          ...p,
          isSolved: solvedProblemIds.has(p.problemId),
        }));

        return {
          ...playlist,
          problems: problemsWithStatus,
          totalProblems: problemIds.length,
          solvedProblems: solvedProblems.length,
          progress: problemIds.length > 0 ? Math.round((solvedProblems.length / problemIds.length) * 100) : 0,
        };
      })
    );

    res.status(200).json({
      success: true,
      message: "Enrolled playlists fetched successfully",
      playlists: enrichedPlaylists,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "Error while fetching enrolled playlists",
    });
  }
};

// Get unique problems (problems with unique titles)
export const getUniqueProblems = async (req, res) => {
  try {
    const userId = req.user.id;

    // Get all problems from enrolled playlists
    const enrolledPlaylists = await db.enrolledPlaylist.findMany({
      where: {
        userId,
      },
      include: {
        problems: {
          include: {
            problem: true,
          },
        },
      },
    });

    // Also get problems from user's personal playlists
    const userPlaylists = await db.playlist.findMany({
      where: {
        userId,
        isAdminPlaylist: false,
      },
      include: {
        problems: {
          include: {
            problem: true,
          },
        },
      },
    });

    // Combine all problems
    const allProblems = [];
    
    // Add problems from enrolled playlists
    enrolledPlaylists.forEach(playlist => {
      playlist.problems.forEach(p => {
        allProblems.push(p.problem);
      });
    });

    // Add problems from user's personal playlists
    userPlaylists.forEach(playlist => {
      playlist.problems.forEach(p => {
        allProblems.push(p.problem);
      });
    });

    // Get unique problems by title
    const uniqueProblems = [];
    const seenTitles = new Set();

    for (const problem of allProblems) {
      if (!seenTitles.has(problem.title)) {
        seenTitles.add(problem.title);
        uniqueProblems.push(problem);
      }
    }

    // Get solve status for unique problems
    const problemIds = uniqueProblems.map(p => p.id);
    const solvedProblems = await db.problemSolved.findMany({
      where: {
        userId,
        problemId: { in: problemIds },
      },
    });

    const solvedProblemIds = new Set(solvedProblems.map(sp => sp.problemId));
    
    const problemsWithStatus = uniqueProblems.map(problem => ({
      ...problem,
      isSolved: solvedProblemIds.has(problem.id),
    }));

    res.status(200).json({
      success: true,
      message: "Unique problems fetched successfully",
      problems: problemsWithStatus,
      totalProblems: problemsWithStatus.length,
      solvedProblems: solvedProblems.length,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "Error while fetching unique problems",
    });
  }
};

// Get enrolled playlist details
export const getEnrolledPlaylistDetails = async (req, res) => {
  try {
    const { enrolledPlaylistId } = req.params;
    const userId = req.user.id;

    const enrolledPlaylist = await db.enrolledPlaylist.findUnique({
      where: {
        id: enrolledPlaylistId,
        userId,
      },
      include: {
        originalPlaylist: {
          select: {
            id: true,
            name: true,
            description: true,
            visibility: true,
            user: {
              select: {
                username: true,
              },
            },
          },
        },
        problems: {
          include: {
            problem: true,
          },
        },
      },
    });

    if (!enrolledPlaylist) {
      return res.status(404).json({
        error: "Enrolled playlist not found",
      });
    }

    // Get solve status for problems
    const problemIds = enrolledPlaylist.problems.map(p => p.problemId);
    const solvedProblems = await db.problemSolved.findMany({
      where: {
        userId,
        problemId: { in: problemIds },
      },
    });

    const solvedProblemIds = new Set(solvedProblems.map(sp => sp.problemId));
    
    const problemsWithStatus = enrolledPlaylist.problems.map(p => ({
      ...p,
      isSolved: solvedProblemIds.has(p.problemId),
    }));

    res.status(200).json({
      success: true,
      message: "Enrolled playlist details fetched successfully",
      playlist: {
        ...enrolledPlaylist,
        problems: problemsWithStatus,
        totalProblems: problemIds.length,
        solvedProblems: solvedProblems.length,
        progress: problemIds.length > 0 ? Math.round((solvedProblems.length / problemIds.length) * 100) : 0,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "Error while fetching enrolled playlist details",
    });
  }
};

// Remove enrolled playlist
export const removeEnrolledPlaylist = async (req, res) => {
  try {
    const { enrolledPlaylistId } = req.params;
    const userId = req.user.id;

    // Check if enrolled playlist exists and belongs to user
    const enrolledPlaylist = await db.enrolledPlaylist.findUnique({
      where: {
        id: enrolledPlaylistId,
        userId,
      },
    });

    if (!enrolledPlaylist) {
      return res.status(404).json({
        error: "Enrolled playlist not found",
      });
    }

    // Delete the enrolled playlist (cascade will handle problem relations)
    await db.enrolledPlaylist.delete({
      where: {
        id: enrolledPlaylistId,
      },
    });

    res.status(200).json({
      success: true,
      message: "Enrolled playlist removed successfully",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "Failed to remove enrolled playlist",
    });
  }
};

// Create user's personal playlist
export const createUserPlaylist = async (req, res) => {
  try {
    const { name, description } = req.body;
    const userId = req.user.id;

    if (!name || name.trim().length === 0) {
      return res.status(400).json({
        error: "Playlist name is required",
      });
    }

    // Check for existing personal playlist with same name
    const existingPlaylist = await db.playlist.findFirst({
      where: {
        name,
        userId,
        isAdminPlaylist: false,
      },
    });

    if (existingPlaylist) {
      return res.status(400).json({
        error: "A personal playlist with this name already exists",
      });
    }

    const playlist = await db.playlist.create({
      data: {
        name,
        description,
        userId,
        isAdminPlaylist: false,
      },
    });

    res.status(201).json({
      success: true,
      message: "Personal playlist created successfully",
      playlist,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "Failed to create personal playlist",
    });
  }
};