const express = require('express');
const deskController = require('../controllers/deskController')
const router = express.Router();

router.get('/getDeskStatus', deskController.get_desk_status)
router.get('/getAllLevels',deskController.get_all_levels)
router.get('/getAllSensors', deskController.get_all_sensors)
router.post('/addDesk',deskController.add_desk)
router.delete('/deleteDesk',deskController.delete_desk)
// router.post('/permitJoin', deskController.permit_join)
// router.post('/pairDevice', deskController.pairDevice)

module.exports = router;