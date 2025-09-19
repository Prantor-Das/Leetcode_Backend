import { db } from "../libs/db.js";
import crypto from "crypto";

// Create admin playlist (public/private)
export const createAdminPlaylist = async (req, res) => {
  try {
    const { name, description, visibility, secretKey } = req.body;
    const userId = req.user.id;

    // Check if user is admin
    if (req.user.role !== "ADMIN") {
      return res.status(403).json({
        error: "Only admins can create admin playlists",
      });
    }

    if (!name || name.trim().length === 0) {
      return res.status(400).json({
        error: "Playlist name is required",
      });
    }

    // Validate visibility
    if (visibility && !["PUBLIC", "PRIVATE"].includes(visibility)) {
      return res.status(400).json({
        error: "Visibility must be either PUBLIC or PRIVATE",
      });
    }

    // If private playlist, ensure secret key is provided
    if (visibility === "PRIVATE" && (!secretKey || secretKey.trim().length === 0)) {
      return res.status(400).json({
        error: "Secret key is required for private playlists",
      });
    }

    // Check for existing playlist with same name by same admin
    const existingPlaylist = await db.playlist.findFirst({
      where: {
        name,
        userId,
        isAdminPlaylist: true,
      },
    });

    if (existingPlaylist) {
      return res.status(400).json({
        error: "An admin playlist with this name already exists",
      });
    }

    const playlist = await db.playlist.create({
      data: {
        name,
        description,
        userId,
        visibility: visibility || "PUBLIC",
        secretKey: visibility === "PRIVATE" ? secretKey : null,
        isAdminPlaylist: true,
      },
    });

    res.status(201).json({
      success: true,
      message: "Admin playlist created successfully",
      playlist: {
        ...playlist,
        secretKey: undefined, // Don't expose secret key in response
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "Failed to create admin playlist",
    });
  }
};

// Update admin playlist (toggle visibility, update secret key)
export const updateAdminPlaylist = async (req, res) => {
  try {
    const { playlistId } = req.params;
    const { name, description, visibility, secretKey } = req.body;
    const userId = req.user.id;

    // Check if user is admin
    if (req.user.role !== "ADMIN") {
      return res.status(403).json({
        error: "Only admins can update admin playlists",
      });
    }

    // Fetch the playlist to ensure it exists and belongs to the admin
    const existingPlaylist = await db.playlist.findUnique({
      where: {
        id: playlistId,
      },
    });

    if (!existingPlaylist) {
      return res.status(404).json({
        error: "Playlist not found",
      });
    }

    if (existingPlaylist.userId !== userId || !existingPlaylist.isAdminPlaylist) {
      return res.status(403).json({
        error: "You are not authorized to update this playlist",
      });
    }

    // Validate visibility if provided
    if (visibility && !["PUBLIC", "PRIVATE"].includes(visibility)) {
      return res.status(400).json({
        error: "Visibility must be either PUBLIC or PRIVATE",
      });
    }

    // If changing to private, ensure secret key is provided
    if (visibility === "PRIVATE" && (!secretKey || secretKey.trim().length === 0)) {
      return res.status(400).json({
        error: "Secret key is required for private playlists",
      });
    }

    // Check for duplicate name if name is being changed
    if (name && name !== existingPlaylist.name) {
      const duplicate = await db.playlist.findFirst({
        where: {
          userId,
          name,
          isAdminPlaylist: true,
          NOT: {
            id: playlistId,
          },
        },
      });

      if (duplicate) {
        return res.status(400).json({
          error: "Another admin playlist with the same name already exists",
        });
      }
    }

    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (visibility !== undefined) {
      updateData.visibility = visibility;
      updateData.secretKey = visibility === "PRIVATE" ? secretKey : null;
    }

    const updatedPlaylist = await db.playlist.update({
      where: { id: playlistId },
      data: updateData,
    });

    res.status(200).json({
      success: true,
      message: "Admin playlist updated successfully",
      playlist: {
        ...updatedPlaylist,
        secretKey: undefined, // Don't expose secret key in response
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "Failed to update admin playlist",
    });
  }
};

// Get all admin playlists (for admin view)
export const getAllAdminPlaylists = async (req, res) => {
  try {
    const userId = req.user.id;

    // Check if user is admin
    if (req.user.role !== "ADMIN") {
      return res.status(403).json({
        error: "Only admins can view admin playlists",
      });
    }

    const playlists = await db.playlist.findMany({
      where: {
        userId,
        isAdminPlaylist: true,
      },
      include: {
        problems: {
          include: {
            problem: true,
          },
        },
        enrolledPlaylists: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                email: true,
              },
            },
          },
        },
      },
    });

    // Don't expose secret keys in response
    const sanitizedPlaylists = playlists.map(playlist => ({
      ...playlist,
      secretKey: undefined,
      hasSecretKey: playlist.visibility === "PRIVATE" && !!playlist.secretKey,
    }));

    res.status(200).json({
      success: true,
      message: "Admin playlists fetched successfully",
      playlists: sanitizedPlaylists,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "Error while fetching admin playlists",
    });
  }
};

// Get all playlists visible to users (both public and private admin playlists)
export const getAllPublicPlaylists = async (req, res) => {
  try {
    const playlists = await db.playlist.findMany({
      where: {
        isAdminPlaylist: true,
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
        user: {
          select: {
            id: true,
            username: true,
          },
        },
      },
    });

    // Don't expose secret keys in response
    const sanitizedPlaylists = playlists.map(playlist => ({
      ...playlist,
      secretKey: undefined,
      hasSecretKey: playlist.visibility === "PRIVATE",
    }));

    res.status(200).json({
      success: true,
      message: "Public playlists fetched successfully",
      playlists: sanitizedPlaylists,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "Error while fetching public playlists",
    });
  }
};

// Clone playlist (enroll in playlist)
export const clonePlaylist = async (req, res) => {
  try {
    const { playlistId } = req.params;
    const { secretKey } = req.body;
    const userId = req.user.id;

    // Check if playlist exists and is admin playlist
    const playlist = await db.playlist.findUnique({
      where: {
        id: playlistId,
      },
      include: {
        problems: {
          include: {
            problem: true,
          },
        },
      },
    });

    if (!playlist || !playlist.isAdminPlaylist) {
      return res.status(404).json({
        error: "Playlist not found or not available for cloning",
      });
    }

    // Check if it's a private playlist and validate secret key
    if (playlist.visibility === "PRIVATE") {
      if (!secretKey || secretKey !== playlist.secretKey) {
        return res.status(401).json({
          error: "Invalid secret key for private playlist",
        });
      }
    }

    // Check if user has already enrolled in this playlist
    const existingEnrollment = await db.enrolledPlaylist.findUnique({
      where: {
        userId_originalPlaylistId: {
          userId,
          originalPlaylistId: playlistId,
        },
      },
    });

    if (existingEnrollment) {
      return res.status(400).json({
        error: "You are already enrolled in this playlist",
      });
    }

    // Create enrolled playlist
    const enrolledPlaylist = await db.enrolledPlaylist.create({
      data: {
        userId,
        originalPlaylistId: playlistId,
        name: playlist.name,
        description: playlist.description,
      },
    });

    // Add all problems from original playlist to enrolled playlist
    if (playlist.problems.length > 0) {
      await db.problemInEnrolledPlaylist.createMany({
        data: playlist.problems.map(({ problemId }) => ({
          enrolledPlaylistId: enrolledPlaylist.id,
          problemId,
        })),
      });
    }

    res.status(201).json({
      success: true,
      message: "Playlist cloned successfully",
      enrolledPlaylist: {
        ...enrolledPlaylist,
        problemCount: playlist.problems.length,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "Failed to clone playlist",
    });
  }
};

// Get submission metrics for admin playlist
export const getPlaylistMetrics = async (req, res) => {
  try {
    const { playlistId } = req.params;
    const userId = req.user.id;

    // Check if user is admin
    if (req.user.role !== "ADMIN") {
      return res.status(403).json({
        error: "Only admins can view playlist metrics",
      });
    }

    // Verify playlist ownership
    const playlist = await db.playlist.findUnique({
      where: {
        id: playlistId,
        userId,
        isAdminPlaylist: true,
      },
    });

    if (!playlist) {
      return res.status(404).json({
        error: "Playlist not found",
      });
    }

    // Get enrolled users and their progress
    const enrolledPlaylists = await db.enrolledPlaylist.findMany({
      where: {
        originalPlaylistId: playlistId,
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
        problems: {
          include: {
            problem: {
              select: {
                id: true,
                title: true,
                difficulty: true,
              },
            },
          },
        },
      },
    });

    // Get problem solve status for each enrolled user
    const metrics = await Promise.all(
      enrolledPlaylists.map(async (enrolledPlaylist) => {
        const problemIds = enrolledPlaylist.problems.map(p => p.problemId);
        
        const solvedProblems = await db.problemSolved.findMany({
          where: {
            userId: enrolledPlaylist.userId,
            problemId: { in: problemIds },
          },
        });

        const totalProblems = problemIds.length;
        const solvedCount = solvedProblems.length;
        const progress = totalProblems > 0 ? (solvedCount / totalProblems) * 100 : 0;

        return {
          user: enrolledPlaylist.user,
          totalProblems,
          solvedProblems: solvedCount,
          progress: Math.round(progress),
          enrolledAt: enrolledPlaylist.enrolledAt,
        };
      })
    );

    res.status(200).json({
      success: true,
      message: "Playlist metrics fetched successfully",
      playlist: {
        id: playlist.id,
        name: playlist.name,
        description: playlist.description,
        visibility: playlist.visibility,
      },
      metrics,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "Failed to fetch playlist metrics",
    });
  }
};