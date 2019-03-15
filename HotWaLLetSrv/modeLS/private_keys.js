var mongoose = require('mongoose')

var perivateSchema = new mongoose.Schema({
  addr: String,
  key: String,
  enc: Boolean
},
{
  versionKey : false
})

module.exports = mongoose.model('private_keys', perivateSchema)
