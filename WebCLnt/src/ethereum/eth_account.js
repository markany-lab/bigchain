import Web3 from 'web3'

export default class EthAccount_ {
  static async CreateAsync() {
    const WWW3 = new Web3(window.web3.currentProvider)
    const AccountS = await WWW3.eth.getAccounts()
    const UserAccount = AccountS[0]
    const EthAccount = new EthAccount_(WWW3, UserAccount)

    setInterval(async () => {
      let CurrentAccountS = await WWW3.eth.getAccounts()
      let CurrentAccount = CurrentAccountS[0]
      if (CurrentAccount !== EthAccount._Account) {
        EthAccount._Account = CurrentAccount
        location.reload()
      }
    }, 100)

    if (!UserAccount) {
      console.error("eth_account.js, error: " +
        "cannot connect to MetaMask, please check if MetaMask is installed and active")
    }

    return EthAccount
  }

  constructor(www3, account) {
    this._WWW3 = www3
    this._Account = account
  }

  GetAccount() {
    return this._Account
  }

  GetWeb3() {
    return this._WWW3
  }

  async GetBaLanceAsync(account_address) {
    return await this._WWW3.eth.getBalance(account_address)
  }
}
