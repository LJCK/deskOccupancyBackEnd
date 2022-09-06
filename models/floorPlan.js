const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const imgSchema = new mongoose.Schema({
  _id: {
    type: String,
    required: true
  },
  location:{
    type: String,
    required: true
  },
  level:{
    type: String,
    required: true
  },
  img: {
    data: Buffer,
    contentType: String,
  },
});

module.exports = ImageModel = mongoose.model("Image", imgSchema);