const express = require('express');
const deskController = require('../controllers/deskController')
const router = express.Router();

router.get('/getDeskStatus', deskController.get_desk_status)
router.get('/getAllLevels',deskController.get_all_levels)

module.exports = router;