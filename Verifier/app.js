const express = require('express');
var cors = require('cors');
const fs = require('fs');
const bodyParser = require('body-parser');
const app = express();
const etherutil = require('ethereumjs-util');

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
  extended: true
}));


app.post('/get_receipt', (req, res) => {
  console.log(req.body)
  res.json({code:"-1"})
})

app.listen(3003, () => {
    console.log('Example app listening on port 3003!');
  });