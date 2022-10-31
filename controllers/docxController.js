const docxModel = require('../models/docxModel')
const fs = require("fs");

const postDocx=async(req, res)=>{
  console.log(req.body)
  const saveDoc =  docxModel({
    _id: req.body.UID,
    docx: {
      data: fs.readFileSync("uploads/" + req.file.filename),
      contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    },
  });
  saveDoc
    .save()
    .then((res) => {
      res.status(200).send('Floor plan is uploaded')
    })
    .catch((err) => {
      res.send(err)
    });
}

const getDocx = async(req,res)=>{
  const data = []
  const docx =await docxModel.findById({_id:req.query.filename}).catch(err =>console.log(err))
  data.push(docx)
  res.json(data)
}

module.exports = {
  postDocx,
  getDocx
}