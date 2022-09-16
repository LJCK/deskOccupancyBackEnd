const {newOccupancy, IoTData} = require("../models/sensor")
const moment = require("moment");
const awsIot = require("aws-iot-device-sdk");
const dotenv = require("dotenv")
dotenv.config()

THRESHOLD_5_MINUTES = process.env.THRESHOLD_5_MINUTES
THRESHOLD_60_MINUTES = process.env.THRESHOLD_60_MINUTES
AWS_HOST_ID = process.env.AWS_HOST_ID

const device = awsIot.device({
  host: AWS_HOST_ID,
  port: 8883,
  keyPath: './certs/private.pem.key',
  certPath: './certs/certificate.pem.crt',
  caPath: './certs/Amazon-root-CA-1.pem',
});

device.on("connect", function(){
  console.log("aws iot is connected")
});

//Handle connection errors
device.on("error", (error) => {
    console.log("Can't connect" + error);
    process.exit(1);
})

//Set onMessage callback
device.on("message", onMessage)

//Subscribe to topic 
// # wildcard subscribes to all nested topics under zigbee2mqtt/devices (we use devices to distinguish messages, the friendly name naming convention should be devices/<sensorName>)
device.subscribe("zigbee2mqtt/devices/#");


function onMessage(topic, message) { 
  // on message, logs data to mongoDB
  // this if condition is to prevent empty message crashing the backend
  if(message.toString('utf8')!=""){
    let topicComponents = topic.split("/")
    let sensorName = topicComponents[2]; //assuming friendly name follows convention of <sensorType>_<sensorName>
    let payload = JSON.parse(message)

    const sensorType = sensorName.split("_")[2]
    //only log the data if it's from vibration sensor
    if(sensorType === "vibration"){
      logData(sensorName, new Date(), payload).catch(console.dir);
    }
  }
}

async function logData(sensorID, timestamp, payload) { //writes the data to mongoDB
  
  if(payload.vibration === true && (payload.action ==="vibration" || payload.action ==="tilt" || payload.action ==="drop")){
    try {
      sensorName_array = sensorID.split("_")
      locationID = sensorName_array[0]+"_"+sensorName_array[1]
      let IoTObj = await IoTData({
          "timestamp": timestamp, //will write as UTC date - must handle coversion to SG time in application
          "metaData": {
            "sensorID": sensorID,
            "locationID": locationID,
            "vibration": payload.vibration,
          },
      })
      try{
        console.log("received a vibration:\n",IoTObj)
        IoTObj.save()
        update_sensor_status(locationID, sensorID)
        console.log('Logged the data')
      }
      catch(error){
        console.log("Logging data went wrong:\n", error)
      }
    }catch(error){
      console.log(error)
    }
  }
}

const get_all_sensors = async(req,res)=>{
  const allSensors = await newOccupancy.find({})
  res.status(200).send(allSensors)
}

const update_sensor_status=async(locationID, sensorID)=>{
  
  // get the specific sensor array 
  const matchedSensor = await newOccupancy.findOne(
    {
      _id : locationID, 
      sensors : { $elemMatch : {sensorID : sensorID}}
    },
    {
      "sensors.$":1
    }
  )

  console.log("updating vibrated sensor")
  if (matchedSensor != []){ 
    // skip non vibration type sensors
    console.log("updating sensor\n", matchedSensor)
    if(matchedSensor.sensors[0].sensorType != "vibration"){
      return
    }

    const isNumOfOccuModified = false
    const needUpdate = false
    const expiry_time = moment(matchedSensor.sensors[0].expiryTime);
    const sensorID = matchedSensor.sensors[0].sensorID
    const newSensorData = matchedSensor.sensors[0]
    // this is to check if the table is unoccupied
    if(expiry_time===null || expiry_time.isBefore(moment.utc().local())){
      if(await compareSensorTimeseries(sensorID, 5)){
        // console.log('change status to occupied')
        newSensorData.status = 'occupied'
        newSensorData.expiryTime = moment.utc().local().add(4,'hours')
        newSensorData.skipTime = moment.utc().local().add(2,"hours")
        isNumOfOccuModified = true
        needUpdate = true
      }
    }else{
      skip_time = moment(newSensorData["skipTime"])
      if(skip_time.isBefore(moment.utc().local())){
        if(await compareSensorTimeseries(sensorID, 120)){
          // console.log("returned from 60 mins checking")
          newSensorData.expiryTime = moment.utc().local().add(2,'hours')
          needUpdate = true
        }
      }
    }

    if(needUpdate){
      await newOccupancy.findOneAndUpdate(
        {
          "_id" : locationID, 
          sensors : { $elemMatch : {sensorID : sensorID}}
        },
        {
          $set : {"sensors.$[elem]": newSensorData},
          $inc : {occupiedSensors: isNumOfOccuModified == true? 1:0}
        },
        {
          arrayFilters: [{"elem.sensorID":{$eq:sensorID}}]
        }
      )
      
      // push all sensors at that floor to frontend
      const allSensors = await newOccupancy.findOne({"_id":locationID})
      metaData = JSON.stringify({"sensors":allSensors})
      device.publish(`bumGoWhere/frontend/update/${locationID}`, payload = metaData, QoS=1)
      console.log("push data to frontend")
    }
  }
}

async function compareSensorTimeseries(sensorID, time){
  const now = new Date()
  const some_minutes_ago = new Date(now.setMinutes(now.getMinutes()-time)).toISOString()
  const records = await IoTData.find({"timestamp": {$gte: some_minutes_ago}, "metaData.sensorID":sensorID })
  console.log("check past ", time, " minutes")
  console.log("length of records ", records.length)
  if(time === 5){
    if(records.length > THRESHOLD_5_MINUTES){
      return true
    }else{
      return false
    }
  }else{
    if(records.length > THRESHOLD_60_MINUTES){
      return true
    }else{
      return false
    }
  }
}

const get_sensor_status = async(req,res)=>{
  const query_level = req.query.level
  const allSensors = await newOccupancy.findOne({_id:query_level})
  if(allSensors){
    res.status(200).send({sensors: allSensors})
  }else{
    res.status(404).send("No sensor record found in database")
  }
}

const get_all_levels=async(req,res)=>{
  const location = req.query.location
  const floors = await newOccupancy.find({location: location}).sort({"level":1})
  res.send(floors)
}

const checkExpire = async()=>{
  // checkExpire will change all expired sensors to unoccupied
  // then update the number of occupied sensors based on the updated sensor array
  // this is called by cron job
  await newOccupancy.updateMany(
    {},
    {
      $set:{"sensors.$[sensor].status":"unoccupied"}
    },
    {
      arrayFilters: [
        {
          "sensor.expiryTime": {$lt: moment.utc().local()}
        }]
    }
  )

  const numOfUnoccu = await newOccupancy.aggregate([
    {
      $project : {
        _id:1, 
        sensors : {
          $size: {
            $filter : {
              input: "$sensors", 
              as: "e", 
              cond: { 
                $eq: ["$$e.status", "occupied"]
              }
            }
          }
        }
      } 
    } 
  ])

  for(let item of numOfUnoccu){
    try{
      await newOccupancy.updateOne({
        _id:item._id
      },{
        occupiedSensors : item.sensors
      })
    }catch(error){
      console.log("updating number of occupied went wrong")
    }
  }
}

const add_sensor=async(req,res)=>{
  const sensorID = req.body.sensorID
  const location = req.body.location
  const locationID = req.body.locationID
  const level = req.body.level
  const sensorType = req.body.sensorType
  console.log("sensorID ", sensorID)
  try{
    const sensorObj = await newOccupancy.findOne({_id: locationID,sensors:{$elemMatch:{sensorID:sensorID}}})
    if(sensorObj){
      res.status(409).send("Sensor ID already exists.")
    }else{
      
      // push the new sensor to the sensors array
      let updatedSensorObj = await newOccupancy.updateOne(
        {_id: locationID},
        {
          $push:{"sensors":{sensorID:sensorID,status: null, sensorType: sensorType, expiryTime: null}}, 
          $inc: {numOfVibrationSensors: sensorType == "vibration"? 1:0 }
        })
      console.log("updatedSensorObj ", updatedSensorObj)
      if(updatedSensorObj.acknowledged == true && updatedSensorObj.modifiedCount == 1){
        res.status(200).send("Sensor added successful.")
      }else{
        console.log("No record in DB, now creating")
        const newSensor ={
          _id : locationID, 
          location : location, 
          level : level,
          sensors :[{
            sensorID : sensorID,
            status : null, 
            sensorType : sensorType, 
            expiryTime: null
          }], 
          numOfVibrationSensors : sensorType =="vibration" ? 1 : 0, 
          occupiedSensors : 0
        }
        let sensorObj = await newOccupancy(newSensor)
        try{
          sensorObj.save()
          res.status(200).send("Sensor added successful.")
        }
        catch{
          res.status(404).send("Sensor added unsuccessful")
        }
      }
    }
  }catch(error){
    console.log("error\n",error)
  }
}

const delete_sensor = async(req,res)=>{

  const locationID = req.body.locationID
  const sensorID = req.body.sensorID
  const sensorType = sensorID.split("_")[2] //assuming the sensorID is <location>_<level>_<sensorType>_<id>
  try{
    console.log("remove ", sensorID)
    await newOccupancy.updateOne({"_id": locationID,"sensors":{"$elemMatch":{"sensorID":sensorID}}},
      {
        $pull: {"sensors":{"sensorID":sensorID}},
        $inc: {numOfVibrationSensors : sensorType == "vibration" ? -1 : 0}
      }) 
    console.log("removed one table")
    res.status(200).send("Sensor removed.")
  }catch(error){
    res.send("error")
  }
}

module.exports={
  get_sensor_status,
  get_all_levels,
  get_all_sensors,
  add_sensor,
  delete_sensor,
  checkExpire,
}