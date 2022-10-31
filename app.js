const express = require('express');
const mongoose = require('mongoose')
const morgan = require('morgan')
const bodyParser = require('body-parser')
const multer = require('multer');
const {GridFsStorage} = require('multer-gridfs-storage');
const Grid = require('gridfs-stream');
const methodOverride = require('method-override');
const cron = require('node-cron');
const dotenv = require("dotenv")
dotenv.config()

var cors = require('cors')

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
let gfs;
conn.once('open', () => {
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

app.get('/', (req,res)=>{
  gfs.files.find().toArray((err, files) => {
    return res.json(files);
  })
})

app.post('/upload',upload.single("file"),(req,res)=>{
  res.json({ file: req.file });
})



// cron job reference 
// * * * * * *
// second (optional), minute, hour, day of month, month, day of week( 0 - 7, where 0 or 7 are sunday)
// the design below means every 5 minuts from 8am to 7 pm on monday to friday will call checkExpire()
// cron.schedule('*/5 8-19 * * 1-5', () => {
//   sensorController.checkExpire()
//   console.log("cron job ran, all sensors and number of occupied sensors should be updated based on the expiry time")
// });