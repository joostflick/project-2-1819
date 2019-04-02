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

      res.render('index', { data: parsedData })
    }
  )
})

function calculatePoints(room) {
  var points = 0
  console.log(room)
  // availability
  if (!room.measurements.occupancy) {
    points = points + 1000
  }
  // temperature
  points = points + (20000 - room.measurements.temperature) / 100
  // co2
  if (room.measurements.co2 > 600) {
    points = points - 100
  }
  // sound
  points = points - room.measurements.mic_level / 100

  return points
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
