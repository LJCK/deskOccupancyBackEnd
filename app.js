const express = require('express');
const mongoose = require('mongoose')
const morgan = require('morgan')
const bodyParser = require('body-parser');
var cors = require('cors')
const app = express();
const PORT = 3001;
  

var corsOptions = {
    origin: '*',
}

//connect to mongodb
const dbURI = 'mongodb+srv://zhiheng:zhiheng@cluster0.s7nla.mongodb.net/?retryWrites=true&w=majority'
// const dbURI = 'mongodb+srv://qinxiang:qinxiang@cluster0.ojjsesl.mongodb.net/?retryWrites=true&w=majority'
mongoose.connect(dbURI, {useNewUrlParser: true, useUnifiedTopology: true }) //its an async task, returns something like a promise
        .then(result => app.listen(PORT, () => console.log('connected to db, server started')))
        .catch(err => console.log(err));

app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));
app.use(bodyParser.json()) // for parsing application/json
app.use(bodyParser.urlencoded({ extended: true })) // for parsing application
app.use(cors(corsOptions))

app.get('/',(req,res)=>{
    res.send("Welcome to backend");
  })