const express = require('express')
const app = express()
const cors = require('cors')
require('dotenv').config()
const mongo = require('mongodb')
const mongoose = require('mongoose')
const mySecret = process.env['user_info']

app.use(cors())
app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})

mongoose.connect(mySecret, { useNewUrlParser: true, useUnifiedTopology: true });

let userSchema = new mongoose.Schema({
  username: { type: String, required: true },
  log: [{
    description: { type: String, required: true },
    duration: { type: Number, required: true },
    date: Date
  }]
})

let user_Model = mongoose.model("Users", userSchema)

let bodyParser = require('body-parser')

let responseObj = {}

app.post("/api/users", bodyParser.urlencoded({ extended: false }), (req, res) => {
  let userName = req.body.username
  user_Model.find({ username: userName }, (err, subject) => {
    if (subject.length === 0) {
      let user = new user_Model({ username: userName })
      user.save((err, save) => {
        if (!err)
          res.json({ username: userName, _id: save._id })
      })
    }
    else
      res.json({ username: subject[0].username, _id: subject[0]._id })
  })
})

app.get('/api/users', (req, res) => {
  user_Model.find({}, (err, data) => {
    if (err)
      console.log(err)
    else
      res.json(data)
  })
})

app.post("/api/users/:_id/exercises", bodyParser.urlencoded({ extended: false }), (req, res) => {
  let responseObject = {}
  const id = req.params._id
  if (id === undefined)
    res.json('Invalid id')
  const description = req.body.description
  const duration = parseInt(req.body.duration)
  const date = req.body.date
  const new_log = {
    description: description,
    duration: duration,
    date: date === undefined ? new Date() : new Date(date)
  }

  user_Model.findByIdAndUpdate(id, { $push: { log: new_log } }, { new: true }, (err, save) => {
    if (err)
      return console.log(err)
    else
      responseObject = {
        username: save.username,
        description: description,
        duration: duration,
        _id: save._id,
        date: new_log.date.toDateString()
      }
    res.json(responseObject)

  })
});

app.get('/api/users/:id/logs', (req, res) => {
  let userid = req.params.id
  let { from, to, limit } = req.query
  user_Model.findById(userid, (err, data) => {
    let resObj = data
    if (!err) {
      if (from)
        from = new Date(from)
      else
        from = 0
      if (to)
        to = new Date(to)
      else
        to = new Date()
      // console.log(from)
      resObj.log = resObj.log.filter(d => {
        return d.date.getTime() > from && d.date.getTime() < to
      })
      resObj = resObj.toJSON()
      resObj.log.forEach(d => {
        const stringDate = d.date.toDateString()
        d.date = stringDate
      })
      resObj['count'] = data.log.length
      resObj.log = resObj.log.slice(0, limit)
      res.json(resObj)
    }
    else if (err)
      console.log(err)
  })
})
