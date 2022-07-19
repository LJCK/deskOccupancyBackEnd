const gfs = require('../app')

const uploadFloorPlan=(req,res)=>{
  res.send("uploaded to db")
}

const getImage=async(req,res)=>{
  // try {
    console.log(req.query.filename)
    const file = await gfs.files.findOne({ filename: req.query.filename });
    // Check if file
    if (!file || file.length === 0) {
      return res.status(404).json({
        err: 'No file exists'
      });
    }

    // Check if image
    if (file.contentType === 'image/jpeg' || file.contentType === 'image/png') {
      // Read output to browser
      const readstream = gfs.createReadStream(file.filename);
      readstream.pipe(res);
    } else {
      res.status(404).json({
        err: 'Not an image'
      });
    }
  // } catch (error) {
  //   res.send("not found");
  // }

}

module.exports={
  uploadFloorPlan, getImage
}