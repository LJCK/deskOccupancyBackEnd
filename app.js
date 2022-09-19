const express = require('express');
const mongoose = require('mongoose')
const morgan = require('morgan')
const bodyParser = require('body-parser')
const sensorRoutes = require('./routes/sensorRoutes')
const floorPlanRoutes = require('./routes/floorPlanRoutes')
const sensorController = require('./controllers/sensorController')
const userRoutes = require('./routes/userRoutes')
const cron = require('node-cron');

var cors = require('cors')

const app = express();
const PORT = process.env.port || 3001;

var corsOptions = {
    origin: '*',
}

//connect to mongodb
const dbURI = 'mongodb+srv://zhiheng:zhiheng@cluster0.s7nla.mongodb.net/?retryWrites=true&w=majority'
// const dbURI = 'mongodb+srv://qinxiang:qinxiang@cluster0.ojjsesl.mongodb.net/?retryWrites=true&w=majority'
mongoose.connect(dbURI, {useNewUrlParser: true, useUnifiedTopology: true }) //its an async task, returns something like a promise
        .then(result => app.listen(PORT, () => console.log('connected to db, server started in port 3001')))
        .catch(err => console.log(err));

app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));
app.use(bodyParser.json()) // for parsing application/json
app.use(bodyParser.urlencoded({ extended: true })) // for parsing application
app.use(cors(corsOptions))

app.get('/', (req,res)=>{
    res.send("Welcome to backend");
  })
app.use('/sensor',sensorRoutes)
app.use('/floorPlan',floorPlanRoutes)
app.use('/user', userRoutes)

// cron job reference 
// * * * * * *
// second (optional), minute, hour, day of month, month, day of week( 0 - 7, where 0 or 7 are sunday)
// the design below means every 5 minuts from 8am to 7 pm on monday to friday will call checkExpire()
cron.schedule('*/5 8-19 * * 1-5', () => {
  sensorController.checkExpire()
  console.log("cron job ran, all sensors and number of occupied sensors should be updated based on the expiry time")
});