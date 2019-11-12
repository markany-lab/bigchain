module.exports = (function () {
  return {
    local: { // localhost
      host: 'localhost',
      port: '3306',
      user: 'lstuser',
      password: 'a123456A',
      database: 'lstdb'
    },
    real: { // real server db info
      host: '',
      port: '',
      user: '',
      password: '!',
      database: ''
    }
  }
})();
