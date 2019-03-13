# 참고:
 - 프라이빗:
   - (ubuntu)http://blog.daum.net/_blog/BlogTypeView.do?blogid=09Bvm&articleno=13222486
   - (mac)https://medium.com/pocs/ethereum01-01-%EC%9D%B4%EB%8D%94%EB%A6%AC%EC%9B%80-%EA%B0%9C%EB%B0%9C%ED%99%98%EA%B2%BD-%EA%B5%AC%EC%B6%95-%EB%82%98%EB%A7%8C%EC%9D%98-%ED%94%84%EB%9D%BC%EC%9D%B4%EB%B9%97-%EB%B8%94%EB%A1%9D%EC%B2%B4%EC%9D%B8-c21bd384f96e
   - (truffle)https://ethereum.stackexchange.com/questions/62803/the-send-transactions-from-field-must-be-defined

$ init.sh
$ start.sh

# 어카운트 생성
> personal.newAccount("Alice")
> personal.newAccount("Bob")
> personal.newAccount("Carlos")
personal.newAccount("password")
personal.newAccount("password")
personal.newAccount("password")
personal.newAccount("password")
personal.newAccount("password")
personal.newAccount("password")
personal.newAccount("password")

# 어카운트 확인
> eth.accounts

# 마이닝여부 확인
> eth.mining

# 마이닝 시작/정지
> miner.start()
> miner.stop()

#
> eth.coinbase
> miner.setEtherbase(eth.accounts[0])

# 계정 언락
> personal.unlockAccount(eth.accounts[0])

# 계정 언락(영구)
> personal.unlockAccount(eth.accounts[0], "Alice", 0)
> personal.unlockAccount(eth.accounts[1], "Bob", 0)
> personal.unlockAccount(eth.accounts[2], "Carlos", 0)

# balance확인
> eth.getBalance(eth.accounts[0])
> web3.fromWei(eth.getBalance(eth.accounts[0]))
> web3.fromWei(eth.getBalance(eth.accounts[1]))
> web3.fromWei(eth.getBalance(eth.accounts[2]))

# 이더전송
> eth.sendTransaction({
    from: eth.accounts[0],
    to: eth.accounts[1],
    value: web3.toWei(100, "ether")
})
> eth.sendTransaction({
    from: eth.accounts[0],
    to: eth.accounts[2],
    value: web3.toWei(100, "ether")
})

# 기타
> eth.blockNumber

# 테스트
truffle console --network local
> web3.eth.defaultAccount = web3.eth.accounts[0]
> test
> .exit
