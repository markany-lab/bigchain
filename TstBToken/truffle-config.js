module.exports = {
  compilers: {
    solc: {
      version: "0.4.24",
    }
  },
  networks: {
    ganache: {
      host: '127.0.0.1',
      port: 7545,
      network_id: '*',
      gasPrice: 1
    }
  }
}
