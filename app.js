const express = require('express');
const mongoose = require('mongoose')
const app = express();
const PORT = 3001;
  

//connect to mongodb
const dbURI = 'mongodb+srv://zhiheng:zhiheng@cluster0.s7nla.mongodb.net/?retryWrites=true&w=majority'
// const dbURI = 'mongodb+srv://qinxiang:qinxiang@cluster0.ojjsesl.mongodb.net/?retryWrites=true&w=majority'

mongoose.connect(dbURI, {useNewUrlParser: true, useUnifiedTopology: true }) //its an async task, returns something like a promise
        .then(result => app.listen('3001', () => console.log('connected to db, server started')))
        .catch(err => console.log(err));

app.listen(PORT, (error) =>{
    if(!error)
        console.log("Server is Successfully Running, and App is listening on port "+ PORT)
    else 
        console.log("Error occurred, server can't start", error);
    }
);
