var createError = require('http-errors')
var express = require('express')
var path = require('path')
var cookieParser = require('cookie-parser')
var logger = require('morgan')
var request = require('request')
var app = express()

// view engine setup
app.set('views', path.join(__dirname, 'views'))
app.set('view engine', 'ejs')

app.use(logger('dev'))
app.use(express.json())
app.use(express.urlencoded({ extended: false }))
app.use(cookieParser())
app.use(express.static(path.join(__dirname, 'public')))

app.get('/', function(req, res, next) {
  request(
    'http://mirabeau.denniswegereef.nl/api/v1/rooms',
    (error, response, body) => {
      if (error) {
        console.log('error:', error)
      }
      console.log('response code:', response.statusCode)

      let data = JSON.parse(body)

      let parsedData = data.data.map(room => ({
        timestamp: convertTimestamp(room.timestamp),
        sensorId: room.hwaddr,
        roomName: room.room_name,
        points: calculatePoints(room),
        color: perc2color(calculatePoints(room)),
        measurements: {
          bap: room.measurements.bapLevel,
          temperature: Math.round(room.measurements.temperature / 1000),
          battery: room.measurements.batt,
          sound: Math.round(room.measurements.mic_level / 100),
          light: room.measurements.ambient_light,
          humidity: room.measurements.humidity,
          co2: room.measurements.co2,
          occupancy: room.measurements.occupancy,
          uv: room.measurements.uv_index,
          voc: room.measurements.voc
        }
      }))
      console.log(parsedData)

      // order rooms based on score
      parsedData.sort(function(x, y) {
        return y.points - x.points
      })

      // move available rooms to the front
      // parsedData.sort(function(x, y) {
      //   return x.measurements.occupancy - y.measurements.occupancy
      // })

      res.render('index', { data: parsedData, title: 'All rooms' })
    }
  )
})

app.get('/available', function(req, res, next) {
  request(
    'http://mirabeau.denniswegereef.nl/api/v1/rooms',
    (error, response, body) => {
      if (error) {
        console.log('error:', error)
      }
      console.log('response code:', response.statusCode)

      let data = JSON.parse(body)

      available = data.data.filter(function(obj) {
        return !obj.measurements.occupancy
      })

      let parsedData = available.map(room => ({
        timestamp: convertTimestamp(room.timestamp),
        sensorId: room.hwaddr,
        roomName: room.room_name,
        points: calculatePoints(room),
        color: perc2color(calculatePoints(room)),
        measurements: {
          bap: room.measurements.bapLevel,
          temperature: Math.round(room.measurements.temperature / 1000),
          battery: room.measurements.batt,
          sound: Math.round(room.measurements.mic_level / 100),
          light: room.measurements.ambient_light,
          humidity: room.measurements.humidity,
          co2: room.measurements.co2,
          occupancy: room.measurements.occupancy,
          uv: room.measurements.uv_index,
          voc: room.measurements.voc
        }
      }))

      // order rooms based on score
      parsedData.sort(function(x, y) {
        return y.points - x.points
      })

      res.render('index', { data: parsedData, title: 'Available rooms' })
    }
  )
})

app.get('/unavailable', function(req, res, next) {
  request(
    'http://mirabeau.denniswegereef.nl/api/v1/rooms',
    (error, response, body) => {
      if (error) {
        console.log('error:', error)
      }
      console.log('response code:', response.statusCode)

      let data = JSON.parse(body)

      available = data.data.filter(function(obj) {
        return obj.measurements.occupancy
      })

      let parsedData = available.map(room => ({
        timestamp: convertTimestamp(room.timestamp),
        sensorId: room.hwaddr,
        roomName: room.room_name,
        points: calculatePoints(room),
        color: perc2color(calculatePoints(room)),
        measurements: {
          bap: room.measurements.bapLevel,
          temperature: Math.round(room.measurements.temperature / 1000),
          battery: room.measurements.batt,
          sound: Math.round(room.measurements.mic_level / 100),
          light: room.measurements.ambient_light,
          humidity: room.measurements.humidity,
          co2: room.measurements.co2,
          occupancy: room.measurements.occupancy,
          uv: room.measurements.uv_index,
          voc: room.measurements.voc
        }
      }))

      // order rooms based on score
      parsedData.sort(function(x, y) {
        return y.points - x.points
      })

      res.render('index', { data: parsedData, title: 'Unavailable rooms' })
    }
  )
})

// calculate percentage range
function mapBetween(currentNum, minAllowed, maxAllowed, min, max) {
  return (
    ((maxAllowed - minAllowed) * (currentNum - min)) / (max - min) + minAllowed
  )
}

// force bigger scale
function calculateNewPercentage(value) {
  if (value < 50) {
    value = 50
  } else if (value > 90) {
    value = 90
  }
  return mapBetween(value, 0, 100, 50, 90)
}

function perc2color(value) {
  var perc = calculateNewPercentage(value)
  var r,
    g,
    b = 0
  if (perc < 50) {
    r = 255
    g = Math.round(5.1 * perc)
  } else {
    g = 255
    r = Math.round(510 - 5.1 * perc)
  }
  var h = r * 0x10000 + g * 0x100 + b * 0x1
  return '#' + ('000000' + h.toString(16)).slice(-6)
}

function calculatePoints(room) {
  var points = 0
  console.log(room)
  // temperature
  var idealTemp = 20
  switch (
    difference(Math.round(room.measurements.temperature / 1000), idealTemp)
  ) {
    case 0:
      points += 25
      break
    case 1:
      points += 20
      break
    case 2:
      points += 15
      break
    case 3:
      points += 10
      break
    case 4:
      points += 5
      break
    default:
      points += 0
  }
  // co2
  var co2 = room.measurements.co2
  switch (true) {
    case co2 < 400:
      points += 25
      break
    case 400 <= co2 < 700:
      points += 20
      break
    case 700 <= co2 < 900:
      points += 15
      break
    case 900 <= co2 < 1000:
      points += 10
      break
    case 1000 <= co2 < 1100:
      points += 5
      break
    default:
      points += 0
  }

  // sound
  var db = Math.round(room.measurements.mic_level / 100)
  switch (true) {
    case db < 10:
      points += 25
      break
    case 10 <= db < 15:
      points += 20
      break
    case 15 <= db < 20:
      points += 15
      break
    case 20 <= db < 25:
      points += 10
      break
    case 25 <= db < 35:
      points += 5
      break
    default:
      points += 0
  }

  // voc
  var voc = room.measurements.voc
  switch (true) {
    case voc < 1000:
      points += 25
      break
    case 1000 <= voc < 3000:
      points += 20
      break
    case 3000 <= voc < 5000:
      points += 15
      break
    case 5000 <= voc < 7000:
      points += 10
      break
    case 7000 <= voc < 10000:
      points += 5
      break
    default:
      points += 0
  }

  return points
}

function difference(a, b) {
  return Math.abs(a - b)
}

function convertTimestamp(unix_timestamp) {
  // Create a new JavaScript Date object based on the timestamp
  // multiplied by 1000 so that the argument is in milliseconds, not seconds.
  var date = new Date(unix_timestamp * 1000)
  var today = date.getDate() + '-' + date.getMonth() + '-' + date.getFullYear()

  // Hours part from the timestamp
  var hours = date.getHours()
  // Minutes part from the timestamp
  var minutes = '0' + date.getMinutes()
  // Seconds part from the timestamp
  var seconds = '0' + date.getSeconds()

  // Will display time in 10:30:23 format
  var formattedTime =
    hours + ':' + minutes.substr(-2) + ':' + seconds.substr(-2)

  return { date: today, time: formattedTime }
}

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404))
})

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message
  res.locals.error = req.app.get('env') === 'development' ? err : {}

  // render the error page
  res.status(err.status || 500)
  res.render('error')
})

module.exports = app
