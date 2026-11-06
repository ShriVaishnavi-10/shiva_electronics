const express = require("express");
const router = express.Router();
const notifCtrl = require("../controllers/notification.controller");
const { authenticate } = require("../middleware/auth.middleware");

router.use(authenticate);

router.get("/", notifCtrl.getUserNotifications);
router.put("/read-all", notifCtrl.markAllNotificationsAsRead);
router.put("/:id/read", notifCtrl.markNotificationAsRead);
router.delete("/:id", notifCtrl.deleteNotification);

module.exports = router;

