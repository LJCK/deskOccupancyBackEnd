const express = require('express');
const mongoose = require('mongoose')
const morgan = require('morgan')
const bodyParser = require('body-parser')
const multer = require('multer');
const {GridFsStorage} = require('multer-gridfs-storage');
const Grid = require('gridfs-stream');
const fs = require('fs');
const dotenv = require("dotenv")
const replacer = require("./replacer")

dotenv.config()

var cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3001;

var corsOptions = {
    origin: '*',
}

//connect to mongodb
// const dbURI = 'mongodb+srv://zhiheng:zhiheng@cluster0.s7nla.mongodb.net/?retryWrites=true&w=majority'
const dbURI = process.env.MONGODBURL
// const dbURI = 'mongodb+srv://qinxiang:qinxiang@cluster0.ojjsesl.mongodb.net/?retryWrites=true&w=majority'
// mongoose.connect(dbURI, {useNewUrlParser: true, useUnifiedTopology: true }) //its an async task, returns something like a promise
//         .then(result => app.listen(PORT, () => console.log('connected to db, server started in port ', PORT)))
//         .catch(err => console.log(err));

const conn = mongoose.createConnection(dbURI)

let gfs, gridfsBucket ;
conn.once('open', () => {
  gridfsBucket = new mongoose.mongo.GridFSBucket(conn.db, {
    bucketName: 'uploads'
  });
  // Init stream
  gfs = Grid(conn.db, mongoose.mongo);  
  gfs.collection('uploads');
  app.listen(PORT, () => console.log('connected to db, server started in port ', PORT));
});


// Create storage engine
const storage = new GridFsStorage({
  url: dbURI,
  file: (req, file) => {
    return new Promise((resolve, reject) => {
        const filename = file.originalname;
        const fileInfo = {
          filename: filename,
          bucketName: 'uploads'
        };
        resolve(fileInfo);
    });
  }
});

const upload = multer({ storage });

app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));
app.use(bodyParser.json()) // for parsing application/json
app.use(bodyParser.urlencoded({ extended: true })) // for parsing application
app.use(cors(corsOptions))


app.get('/getFile', async(req,res)=>{
  const file = await gfs.files.findOne({filename: req.query.filename})
  gridfsBucket.openDownloadStream(file._id).pipe(fs.createWriteStream("./template.docx")).on("error", function(error){
    console.log("error: ", error)
  }).on('finish', function(){
    let inputs = {
      "one":"1. hello \n2. world",
      "two":"this is second line",
      "a":1.1,
      "b":2,
      "c":3,
      "ifelse":true,
      "test":true
    }
    replacer.generateDocx("./template.docx",inputs)

    fs.unlinkSync("./template.docx")
    res.send("done")
  })
})

app.post('/upload',upload.single("file"),(req,res)=>{
  res.json({ file: req.file });
})

// app.delete('/delete', (req,res)=>{
//   gfs.files.remove()
// })


// https://stackoverflow.com/questions/45046716/uploading-a-doc-file-directly-in-mongodb