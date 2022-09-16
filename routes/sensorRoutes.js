const express = require('express');
const sensorController = require('../controllers/sensorController')
const router = express.Router();

router.get('/getSensorStatus', sensorController.get_sensor_status) // for sensor display page
router.get('/getAllLevels',sensorController.get_all_levels) // for nav bar
router.get('/getAllSensors', sensorController.get_all_sensors) // for displaying all sensors in a table
router.post('/addSensor',sensorController.add_sensor)
router.delete('/deleteSensor',sensorController.delete_sensor)
// router.post('/permitJoin', sensorController.permit_join)
// router.post('/pairDevice', sensorController.pairDevice)

module.exports = router;