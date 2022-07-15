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
      type: Object,
      required: true
  } 
});

const newOccupancy = mongoose.model('Current Occupancy', newOccupancySchema);
module.exports = {newOccupancy}