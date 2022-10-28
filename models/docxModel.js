const mongoose = require('mongoose');

const docxSchema = new mongoose.Schema({
  _id: {
    type: String,
    required: true
  },
  docx: {
    data: Buffer,
    contentType: String,
  },
});

module.exports = docxModel = mongoose.model("Docx", docxSchema);