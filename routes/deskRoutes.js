const express = require('express');
const deskController = require('../controllers/deskController')
const router = express.Router();
const requireAuth = require('../middleware/requireAuth')



router.get('/getDeskStatus', deskController.get_desk_status)
router.get('/getAllLevels',deskController.get_all_levels)
router.post('/addDesk',deskController.add_desk)

router.use(requireAuth)
router.get('/getAllSensors', deskController.get_all_sensors)
router.delete('/deleteDesk',deskController.delete_desk)
// router.post('/permitJoin', deskController.permit_join)
// router.post('/pairDevice', deskController.pairDevice)

module.exports = router;