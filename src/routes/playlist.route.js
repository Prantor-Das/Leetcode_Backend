import express from "express";
import { checkAdmin, isLoggedIn } from "../middleware/auth.middleware.js";
import {
  addProblemToPlaylist,
  createPlaylist,
  deletePlaylist,
  getAllListDetails,
  getPlayListDetails,
  removeProblemFromPlaylist,
  updatePlaylist,
} from "../controllers/playlist.controller.js";

import {
  createAdminPlaylist,
  updateAdminPlaylist,
  getAllAdminPlaylists,
  getAllPublicPlaylists,
  clonePlaylist,
  getPlaylistMetrics,
} from "../controllers/adminPlaylist.controller.js";

import {
  getUserPlaylists,
  getEnrolledPlaylists,
  getUniqueProblems,
  getEnrolledPlaylistDetails,
  removeEnrolledPlaylist,
  createUserPlaylist,
} from "../controllers/userPlaylist.controller.js";


const playlistRoutes = express.Router();

// ==================== ADMIN PLAYLIST ROUTES ====================
// Admin-only routes for managing admin playlists
playlistRoutes.post("/admin/playlists", isLoggedIn, checkAdmin, createAdminPlaylist);
playlistRoutes.put("/admin/playlists/:playlistId", isLoggedIn, checkAdmin, updateAdminPlaylist);
playlistRoutes.get("/admin/playlists", isLoggedIn, checkAdmin, getAllAdminPlaylists);
playlistRoutes.get("/admin/playlists/:playlistId/metrics", isLoggedIn, checkAdmin, getPlaylistMetrics);

// Add/remove problems from admin playlists
playlistRoutes.post("/admin/playlists/:playlistId/problems", isLoggedIn, checkAdmin, addProblemToPlaylist);
playlistRoutes.delete("/admin/playlists/:playlistId/problems", isLoggedIn, checkAdmin, removeProblemFromPlaylist);
playlistRoutes.delete("/admin/playlists/:playlistId", isLoggedIn, checkAdmin, deletePlaylist);

// ==================== PUBLIC PLAYLIST ROUTES ====================
// Routes for users to view and clone admin playlists
playlistRoutes.get("/playlists/public", isLoggedIn, getAllPublicPlaylists);
playlistRoutes.post("/playlists/:playlistId/clone", isLoggedIn, clonePlaylist);

// ==================== USER PERSONAL PLAYLIST ROUTES ====================
// Routes for users to manage their personal playlists
playlistRoutes.post("/playlists/personal", isLoggedIn, createUserPlaylist);
playlistRoutes.get("/playlists/personal", isLoggedIn, getUserPlaylists);
playlistRoutes.put("/playlists/personal/:playListId", isLoggedIn, updatePlaylist);
playlistRoutes.delete("/playlists/personal/:playlistId", isLoggedIn, deletePlaylist);
playlistRoutes.post("/playlists/personal/:playlistId/problems", isLoggedIn, addProblemToPlaylist);
playlistRoutes.delete("/playlists/personal/:playlistId/problems", isLoggedIn, removeProblemFromPlaylist);
playlistRoutes.get("/playlists/personal/:playlistId", isLoggedIn, getPlayListDetails);

// ==================== ENROLLED PLAYLIST ROUTES ====================
// Routes for users to manage their enrolled playlists
playlistRoutes.get("/playlists/enrolled", isLoggedIn, getEnrolledPlaylists);
playlistRoutes.get("/playlists/enrolled/:enrolledPlaylistId", isLoggedIn, getEnrolledPlaylistDetails);
playlistRoutes.delete("/playlists/enrolled/:enrolledPlaylistId", isLoggedIn, removeEnrolledPlaylist);

// ==================== PROBLEM ROUTES ====================
// Routes for problem management
playlistRoutes.get("/problems/unique", isLoggedIn, getUniqueProblems);

// ==================== LEGACY ROUTES (for backward compatibility) ====================
// These routes maintain compatibility with your existing playlist controller
playlistRoutes.post("/create-playlist", isLoggedIn, createPlaylist);
playlistRoutes.put(
  "/:playListId/update-playlist-detail",
  isLoggedIn,
  updatePlaylist
);
playlistRoutes.get("/", isLoggedIn, getAllListDetails);
playlistRoutes.get("/:playlistId", isLoggedIn, getPlayListDetails);
playlistRoutes.post(
  "/:playlistId/add-problem",
  isLoggedIn,
  addProblemToPlaylist
);
playlistRoutes.delete("/:playlistId", isLoggedIn, deletePlaylist);
playlistRoutes.delete(
  "/:playlistId/remove-problem",
  isLoggedIn,
  removeProblemFromPlaylist
);

export default playlistRoutes;
