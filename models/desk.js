const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const newOccupancySchema = new Schema({
  _id: { //need to find a way to replace auto generated id with this
    type: String,
    required: true
  },
  location: {
    type: String,
    required: true
  },
  level: {
    type: Number,
    required: true
  },
  desks:{
    type: Array,
    required: true
  },
  numOfSensors:{
    type: Number,
    required: true
  }, 
  occupiedSensors:{
    type: Number,
    required: true
  }
});

const IoTDataSchema = new Schema(
    {
        timestamp: Date,
        metaData:{
            sensorID: String,
            locationID: String,
            vibration: String,
        },
    },
    {
        timeseries: {
            timeField: 'timestamp', //eventual data must have a timestamp field.
            metaField: "metaData", //eventual data must have a sensorName field.
            granularity: "minutes", //can change this to match granularity of data generation
            },
    }
)

const newOccupancy = mongoose.model('Current Occupancy', newOccupancySchema);
const IoTData = mongoose.model("IoT Data Collection", IoTDataSchema)
module.exports = {newOccupancy,IoTData}