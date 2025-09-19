import { db } from "../libs/db.js";

export const createPlaylist = async (req, res) => {
  try {
    const { name, description } = req.body;
    const userId = req.user.id;

    // add more validation like already existing playlist
    if (!name || name.trim().length === 0) {
      return res.status(400).json({
        error: "Playlist name is required",
      });
    }

    const existingPlaylist = await db.playlist.findFirst({
      where: {
        name,
        userId,
      },
    });

    if (existingPlaylist) {
      return res.status(400).json({
        error: "A playlist with this name already exists",
      });
    }

    const playlist = await db.playlist.create({
      data: {
        name,
        description,
        userId,
      },
    });

    res.status(200).json({
      success: true,
      message: "Playlist created successfully",
      playlist,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "Failed to create Playlist",
    });
  }
};

export const updatePlaylist = async (req, res) => {
  try {
    const { playListId } = req.params; // playlist ID from URL
    const { name, description } = req.body;
    const userId = req.user.id;

    // Fetch the playlist to ensure it belongs to the user
    const existingPlaylist = await db.Playlist.findUnique({
      where: {
        id: playListId,
      },
    });

    if (!existingPlaylist) {
      return res.status(404).json({
        error: "Playlist not found",
      });
    }

    if (existingPlaylist.userId !== userId) {
      return res.status(403).json({
        error: "You are not authorized to update this playlist",
      });
    }

    // Prevent changing to an already existing name
    if (name) {
      const duplicate = await db.playlist.findFirst({
        where: {
          userId,
          name,
          NOT: {
            id: playListId,
          },
        },
      });

      if (duplicate) {
        return res.status(400).json({
          error: "Another playlist with the same name already exists",
        });
      }
    }

    const updatedPlaylist = await db.playlist.update({
      where: { id: playListId },
      data: {
        name,
        description,
      },
    });

    res.status(200).json({
      success: true,
      message: "Playlist updated successfully",
      playlist: updatedPlaylist,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "Failed to update playlist",
    });
  }
};

export const getAllListDetails = async (req, res) => {
  try {
    const playlists = await db.playlist.findMany({
      where: {
        userId: req.user.id,
      },
      include: {
        problems: {
          include: {
            problem: true,
          },
        },
      },
    });

    res.status(200).json({
      success: true,
      message: "Playlists Fetched Successfully",
      playlists,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "Error While Fetching Playlists",
    });
  }
};

export const getPlayListDetails = async (req, res) => {
  try {
    const { playlistId } = req.params;

    const playlist = await db.playlist.findUnique({
      where: {
        id: playlistId,
        userId: req.user.id,
      },
      include: {
        problems: {
          include: {
            problem: true,
          },
        },
      },
    });

    if (!playlist) {
      return res.status(404).json({
        error: "Playlist not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Playlist Fetched Successfully",
      playlist,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "Error While Fetching Playlist",
    });
  }
};

export const addProblemToPlaylist = async (req, res) => {
  const { playlistId } = req.params;
  const { problemIds } = req.body; // expected: [id1, id2, id3]

  // Validate input
  if (!Array.isArray(problemIds) || problemIds.length === 0) {
    return res.status(400).json({
      error: "Invalid or missing problemIds",
    });
  }

  try {
    // Fetch existing problemIds already in the playlist
    const existingEntries = await db.ProblemInPlaylist.findMany({
      where: {
        playListId: playlistId,
        problemId: { in: problemIds },
      },
      select: { problemId: true },
    });

    const existingProblemIds = new Set(existingEntries.map((e) => e.problemId));

    // Filter out problemIds already in the playlist
    const newProblemIds = problemIds.filter(
      (id) => !existingProblemIds.has(id)
    );

    if (newProblemIds.length === 0) {
      return res.status(200).json({
        success: true,
        message: "All problems already exist in the playlist",
      });
    }

    // Add new problems to the playlist
    const problemsInPlaylist = await db.ProblemInPlaylist.createMany({
      data: newProblemIds.map((problemId) => ({
        playListId: playlistId,
        problemId,
      })),
    });

    res.status(201).json({
      success: true,
      message: "Problems added to playlist successfully",
      addedCount: problemsInPlaylist.count,
    });
  } catch (error) {
    console.error("Error adding problems to playlist:", error);
    res.status(500).json({
      error: "Failed to add problems to playlist",
    });
  }
};

export const deletePlaylist = async (req, res) => {
  try {
    const { playlistId } = req.params;
    const userId = req.user.id;

    // Check if the playlist exists and belongs to the user
    const playlist = await db.playlist.findUnique({
      where: { id: playlistId },
    });

    if (!playlist) {
      return res.status(404).json({
        error: "Playlist not found",
      });
    }

    if (playlist.userId !== userId) {
      return res.status(403).json({
        error: "You are not authorized to delete this playlist",
      });
    }

    // Proceed with deletion
    const deletedPlaylist = await db.playlist.delete({
      where: {
        id: playlistId,
      },
    });

    res.status(200).json({
      success: true,
      message: "Playlist deleted successfully",
      deletedPlaylist,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "Failed to delete playlist",
    });
  }
};

export const removeProblemFromPlaylist = async (req, res) => {
  const { playlistId } = req.params;
  const { problemIds } = req.body;

  try {
    if (!Array.isArray(problemIds) || problemIds.length === 0) {
      return res.status(400).json({
        error: "Invalid or missing problemId",
      });
    }

    const deletedProblem = await db.ProblemInPlaylist.deleteMany({
      where: {
        playListId: playlistId,
        problemId: {
          in: problemIds,
        },
      },
    });

    res.status(200).json({
      success: true,
      message: "Problem removed from playlist successfully",
      deletedProblem,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "Failed to remove problem from playlist",
    });
  }
};
