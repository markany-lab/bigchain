var mongoose = require('mongoose')

var perivateSchema = new mongoose.Schema({
  addr: String,
  key: String,
  enc: Boolean,
  timestamp: Date
},
{
  versionKey : false
})

module.exports = mongoose.model('private_keys', perivateSchema)

// 전체 추가
// db.private_keys.updateMany({}, {$set: {timestamp: new Date()}})
