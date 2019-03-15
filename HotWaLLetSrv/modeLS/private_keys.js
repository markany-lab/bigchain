var mongoose = require('mongoose')

var schema = mongoose.Schema

var certSchema = new schema({
  _id: String,
  key: String,
  enc: Boolean
});

module.exports = mongoose.model('cert', certSchema)
