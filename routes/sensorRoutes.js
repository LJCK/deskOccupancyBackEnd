const express = require('express');
const sensorController = require('../controllers/sensorController')
const router = express.Router();
const requireAuth = require('../middleware/requireAuth')

router.get('/getSensorStatus', sensorController.get_sensor_status) // for sensor display page
router.get('/getAllLevels',sensorController.get_all_levels) // for nav bar

router.use(requireAuth)
router.get('/getAllSensors', sensorController.get_all_sensors) // for displaying all sensors in a table //ok
router.post('/addSensor',sensorController.add_sensor) //ok
router.delete('/deleteSensor',sensorController.delete_sensor) //ok
// router.post('/permitJoin', sensorController.permit_join)
// router.post('/pairDevice', sensorController.pairDevice)

module.exports = router;