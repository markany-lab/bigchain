const {
  soliditySha3
} = require('web3-utils')
const {
  assertEventVar,
  printEventVar,
  expectThrow,
} = require('./helpers')
const {
  BN
} = web3.utils
const bnChai = require('bn-chai')
const web3Utils = require('web3-utils')

require('chai')
  .use(require('chai-as-promised'))
  .use(bnChai(BN))
  .should()

const BToken = artifacts.require('./BToken.sol')
const ERC721ZToken = artifacts.require('./Core/ERC721Z/ERC721ZToken.sol')
const BChannel = artifacts.require('./BChannel.sol')

Number.prototype.pad = function(size) {
  var s = String(this)
  while (s.length < (size || 2)) {
    s = "0" + s;
  }
  return s
}

contract('BToken', accounts => {
  var Ct
  var ZToken
  var ZChannel
  const [alice, bob, carlos] = accounts

  before(async () => {
    Ct = await BToken.new({
      from: carlos
    })
    ZToken = await ERC721ZToken.new({
      from: carlos
    })
    ZChannel = await BChannel.new({
      from: carlos
    })

    const Owner = await Ct.owner.call({
      from: carlos
    })
    console.log('contract owner: ' + Owner)
    Owner.should.be.equal(carlos)
    await Ct.setERC721ZInterface(ZToken.address, {
      from: carlos
    })
    await ZToken.setOnlyContract(Ct.address, {
      from: carlos
    })
  })

  const TitLeTest = '***** test ******'
  it(TitLeTest, async () => {
    console.log(TitLeTest)
    let Tx = await ZChannel.channelOpen(1000, "0x123123", 20, {
      from: bob,
      value: web3Utils.toWei("0.000001", 'ether')
    })

    let Evt = Tx.logs.find(log => log.event === 'channelOpened')
    console.log("Evt: " + JSON.stringify(Evt))
    const TokenID = Evt.args['oTokenId']

    let channelInfo = await ZChannel.getOTokenDetails(TokenID)
    console.log("channel info: " + JSON.stringify(channelInfo))
    let channelState = channelInfo.state
    console.log("channel state: " + channelState)

    await ZChannel.channelOff(TokenID)

    channelInfo = await ZChannel.getOTokenDetails(TokenID)
    console.log("channel info: " + JSON.stringify(channelInfo))
    channelState = channelInfo.state
    console.log("channel state: " + channelState)

    Tx = await ZChannel.settleChannel(TokenID, [alice, bob], [80, 20], {from: carlos})
    Evt = Tx.logs.find(log => log.event === 'settleFinished')
    console.log("Evt: " + JSON.stringify(Evt))
  })

  return
  const TitLe01 = '***(01)NFTs와 FTs를 둘 다 minting 할 때 정확한 supply를 얻어야 합니다'
  it(TitLe01, async () => {
    console.log(TitLe01)
    for (let i = 0; i < 5; i++) {
      let Tx = await Ct.mintX('타이틀', 0 /*cid*/ , 200 /*fee*/ , '해쉬값', 5, {
        from: bob
      })
      //printEventVar(Tx, 'NewCToken', 'owner')

      let Evt = Tx.logs.find(log => log.event === 'NewCToken')
      const TokenID = Evt.args['cTokenId']

      // const BaLanceOf1 = await Ct.balanceOf.call(bob, TokenID, {from: bob})
      const BaLanceOf1 = await Ct.balanceOf.call(bob, TokenID, {
        from: bob
      })
      console.log("balance of[" + TokenID + "]: " + BaLanceOf1)
    }
    const SuppLy = (await Ct.GetOwnedCTokens.call({
      from: bob
    })).length
    console.log("total supply: " + SuppLy)
    assert.equal(SuppLy, 5)

    var TokenIDs = await Ct.GetOwnedCTokens.call({
      from: bob
    })
    for (let i = 0; i < TokenIDs.length; i++) {
      console.log('TokenIDs[' + i + ']: ' + TokenIDs[i])
    }
  })

  const TitLe04 = '***(04)fungible token을 mint 할 수 있어야 합니다'
  it(TitLe04, async () => {
    console.log(TitLe04)
    const Amount = 5
    const Tx = await Ct.mintX('타이틀', 0 /*cid*/ , 200 /*fee*/ , '해쉬값', Amount, {
      from: bob
    })
    const Evt = Tx.logs.find(log => log.event === 'NewCToken')
    const TokenID = Evt.args['cTokenId']

    const BaLanceOf1 = await Ct.balanceOf.call(bob, TokenID, {
      from: bob
    })
    console.log("balance: " + BaLanceOf1)
    BaLanceOf1.should.be.eq.BN(new BN(5))

    const BaLanceOf2 = (await Ct.GetOwnedCTokens.call({
      from: bob
    })).length
    console.log("balance: " + BaLanceOf2)
    BaLanceOf2.should.be.eq.BN(new BN(6))

    await Ct.mintX_withTokenID(TokenID, Amount /*supply*/ , {
      from: bob
    })
    const NewBaLanceOf1 = await Ct.balanceOf.call(bob, TokenID, {
      from: bob
    })
    console.log("balance: " + NewBaLanceOf1)
    NewBaLanceOf1.should.be.eq.BN(new BN(10))

    const NewBaLanceOf2 = (await Ct.GetOwnedCTokens.call({
      from: bob
    })).length
    console.log("balance: " + NewBaLanceOf2)
    NewBaLanceOf2.should.be.eq.BN(BaLanceOf2)

    await Ct.mintX_withTokenID(TokenID, 65525, {
      from: bob
    }) //65535
    await expectThrow(Ct.mintX_withTokenID(TokenID, 1, {
      from: bob
    }))
  })

  const TitLe09 = '***(09)fungible token에 owner가 없어야합니다'
  it(TitLe09, async () => {
    console.log(TitLe09)
    const Tx = await Ct.mintX('타이틀', 0 /*cid*/ , 200 /*fee*/ , '해쉬값', 200, {
      from: bob
    })
    const Evt = Tx.logs.find(log => log.event === 'NewCToken')
    const TokenID = Evt.args['cTokenId']

    /*검표필요*/
    await expectThrow(Ct.ownerOf.call(TokenID))
  })

  const TitLe11 = '***(11)컨텐츠 토큰 구입'
  it(TitLe11, async () => {
    console.log(TitLe11)
    var Tx = await Ct.mintX('타이틀', 0 /*cid*/ , 200 /*fee*/ , '해쉬값', 200, {
      from: alice
    })
    var Evt = Tx.logs.find(log => log.event === 'NewCToken')
    var TokenID = Evt.args['cTokenId']
    console.log("Evt: " + JSON.stringify(Evt))
    console.log("TokenID: " + TokenID)

    var tokenBalance1 = await Ct.balanceOf.call(bob, TokenID, {
      from: bob
    })
    console.log("token balance: " + tokenBalance1)
    Tx = await Ct.buyToken(TokenID, {
      from: bob,
      value: web3Utils.toWei("200", 'wei')
    })

    Evt = Tx.logs.find(log => log.event === 'NewUToken')
    TokenID = Evt.args['uTokenId']

    var tokenBalance2 = (await Ct.GetOwnedUTokens.call({
      from: bob
    })).length
    console.log("token balance: " + tokenBalance2)
    tokenBalance2.should.be.eq.BN(tokenBalance1.add(new BN(1)))

    var uTokenDetails = await Ct.GetUTokenDetails.call(TokenID, {
      from: bob
    })
    console.log("uTokenDetails: " + JSON.stringify(uTokenDetails))
  })

  // const TitLe15 = '***(15)사용자가 소유 한 정확한 coin 수를 얻어야합니다'
  // it(TitLe15, async () => {
  //   console.log(TitLe15)
  //   let NumTokenS = await Ct.totalSupply()
  //   let BaLanceOf1 = (await Ct.GetOwnedCTokens.call({
  //     from: alice
  //   })).length

  //   const Amount1 = 100
  //   let Tx = await Ct.mintX('타이틀', 0 /*cid*/ , 200 /*fee*/ , '해쉬값', Amount1, {
  //     from: alice
  //   })
  //   let Evt = Tx.logs.find(log => log.event === 'NewCToken')
  //   const TokenID1 = Evt.args['cTokenId']

  //   let NumTokenS1 = await Ct.totalSupply()
  //   NumTokenS1.should.be.eq.BN(NumTokenS.add(new BN(1)))
  //   console.log("total supply: " + NumTokenS1) // 1

  //   await Ct.mintX('타이틀', 0 /*cid*/ , 200 /*fee*/ , '해쉬값', Amount1, {
  //     from: bob
  //   })
  //   let NumTokenS2 = await Ct.totalSupply()
  //   NumTokenS2.should.be.eq.BN(NumTokenS1.add(new BN(1)))
  //   console.log("total supply: " + NumTokenS2) // 2

  //   const Amount2 = 2
  //   Tx = await Ct.mintX('타이틀', 0 /*cid*/ , 200 /*fee*/ , '해쉬값', Amount2, {
  //     from: alice
  //   })
  //   Evt = Tx.logs.find(log => log.event === 'NewCToken')
  //   const TokenID2 = Evt.args['cTokenId']
  //   let NumTokenS3 = await Ct.totalSupply()
  //   NumTokenS3.should.be.eq.BN(NumTokenS2.add(new BN(1)))
  //   console.log("total supply: " + NumTokenS3) // 3

  //   Tx = await Ct.mint('타이틀', 0 /*cid*/ , 200 /*fee*/ , '해쉬값', {
  //     from: alice
  //   })
  //   Evt = Tx.logs.find(log => log.event === 'NewCToken')
  //   const TokenID3 = Evt.args['cTokenId']
  //   let NumTokenS4 = await Ct.totalSupply()
  //   NumTokenS4.should.be.eq.BN(NumTokenS3.add(new BN(1)))
  //   console.log("total supply: " + NumTokenS4) // 4

  //   let BaLanceOf2 = (await Ct.GetOwnedCTokens.call({
  //     from: alice
  //   })).length
  //   BaLanceOf2.should.be.eq.BN(BaLanceOf1 + 3)
  //   console.log("balanceOf: " + BaLanceOf2) // 3

  //   var jump = parseInt(NumTokenS.toString())
  //   const BaLance1 = await Ct.balanceOf.call(alice, 0 + jump, {
  //     from: alice
  //   })
  //   const BaLance2 = await Ct.balanceOf.call(alice, 2 + jump, {
  //     from: alice
  //   })
  //   const BaLance3 = await Ct.balanceOf.call(alice, 3 + jump, {
  //     from: alice
  //   })

  //   BaLance1.should.be.eq.BN(new BN(Amount1))
  //   BaLance2.should.be.eq.BN(new BN(Amount2))
  //   BaLance3.should.be.eq.BN(new BN(1))
  // })

  const TitLe16 = '***(16)Should fail to mint quantity of coins larger than packed bin can represent'
  it(TitLe16, async () => {
    console.log(TitLe16)
    // each bin can only store numbers < 2^16
    await expectThrow(Ct.mintX('타이틀', 0 /*cid*/ , 200, '해쉬값', 65536, {
      from: bob
    }))

    await Ct.mintX('타이틀', 0 /*cid*/ , 200, '해쉬값', 65535, {
      from: bob
    })
  })

  // const TitLe17 = '***(17)NFT에 대해 sender, receiver의 balance와 ownerOf를 업데이트해야 합니다'
  // it(TitLe17, async () => {
  //   console.log(TitLe17)
  //   //         bins :   -- 0 --  ---- 1 ----  ---- 2 ----  ---- 3 ----
  //   let TokenS  = [] //[0,1,2,3, 16,17,18,19, 32,33,34,35, 48,49,50,51]
  //   let CopieS = [] //[0,1,2,3, 12,13,14,15, 11,12,13,14, 11,12,13,14]
  //   let NumTokenS = 100
  //
  //   // Minting enough CopieS for transfer for each TokenS
  //   for (let i = 0; i < NumTokenS; i++) {
  //     const Tx = await Ct.mint('타이틀', 0, 200, '해쉬값', {from: alice})
  //     const Evt = Tx.logs.find(log => log.event === 'NewCToken')
  //     const TokenID = Evt.args['cTokenId']
  //     TokenS.push(Number(TokenID))
  //     CopieS.push(1)
  //   }
  //
  //   const Tx = await Ct.batchTransferFrom(alice, bob, TokenS, CopieS, {from: alice})
  //
  //   let BaLanceFrom
  //   let BaLanceTo
  //   let OwnerOf
  //
  //   for (let i = 0; i < TokenS.length; i++) {
  //     BaLanceFrom = await Ct.balanceOf(alice, TokenS[i])
  //     BaLanceTo = await Ct.balanceOf(bob, TokenS[i])
  //     OwnerOf = await Ct.ownerOf(TokenS[i])
  //
  //     BaLanceFrom.should.be.eq.BN(0)
  //     BaLanceTo.should.be.eq.BN(1)
  //     assert.equal(OwnerOf, bob)
  //   }
  //
  //   assertEventVar(Tx, 'BatchTransfer', 'from', alice)
  //   assertEventVar(Tx, 'BatchTransfer', 'to', bob)
  // })

  // const TitLe18 = '***(18)FT에 대해 sender, receiver의 balance를 업데이트해야합니다'
  // it(TitLe18, async () => {
  //   console.log(TitLe18)
  //   //        bins :   -- 0 --  ---- 1 ----  ---- 2 ----  ---- 3 ----
  //   let TokenS  = [] //[0,1,2,3, 16,17,18,19, 32,33,34,35, 48,49,50,51]
  //   let CopieS = [] //[0,1,2,3, 12,13,14,15, 11,12,13,14, 11,12,13,14]
  //
  //   let NumTokenS = 100
  //   let nCopiesPerCard = 10
  //
  //   //Minting enough CopieS for transfer for each TokenS
  //   for (let i = 0; i < NumTokenS; i++) {
  //     const Tx = await Ct.mintX('타이틀', 0, 200, '해쉬값', Amount, {from: alice})
  //     const Evt = Tx.logs.find(log => log.event === 'NewCToken')
  //     const TokenID = Evt.args['cTokenId']
  //     TokenS.push(Number(TokenID))
  //     CopieS.push(nCopiesPerCard)
  //   }
  //
  //   const Tx = await Ct.batchTransferFrom(alice, bob, TokenS, CopieS, {from: alice})
  //
  //   let BaLanceFrom
  //   let BaLanceTo
  //
  //   for (let i = 0; i < TokenS.length; i++) {
  //     BaLanceFrom = await Ct.balanceOf(alice, TokenS[i])
  //     BaLanceTo = await Ct.balanceOf(bob, TokenS[i])
  //
  //     BaLanceFrom.should.be.eq.BN(0)
  //     BaLanceTo.should.be.eq.BN(CopieS[i])
  //   }
  //
  //   assertEventVar(Tx, 'BatchTransfer', 'from', alice)
  //   assertEventVar(Tx, 'BatchTransfer', 'to', bob)
  // })

  const TitLe12_1 = '***(12-1)Alice가 fungible token을 전송해야합니다'
  it(TitLe12_1, async () => {
    console.log(TitLe12_1)
    let Tx = await Ct.mintX('타이틀', 0 /*cid*/ , 200 /*fee*/ , '해쉬값', 200, {
      from: alice
    })
    const Evt = Tx.logs.find(log => log.event === 'NewCToken')
    const TokenID = Evt.args['cTokenId']

    const AliceBefore = await Ct.balanceOf.call(alice, TokenID, {
      from: alice
    })
    console.log("balance: " + AliceBefore)

    const BobBefore = await Ct.balanceOf.call(bob, TokenID, {
      from: alice
    })
    console.log("balance: " + BobBefore)

    /*Tx = await Ct.safeTransferFrom(
      alice,
      bob,
      TokenID,
      1,
      "0xabcd")

    assertEventVar(Tx, 'TransferWithQuantity', 'from', alice)
    assertEventVar(Tx, 'TransferWithQuantity', 'to', bob)
    assertEventVar(Tx, 'TransferWithQuantity', 'tokenId', Number(TokenID))
    //assertEventVar(Tx, 'TransferWithQuantity', 'quantity', 1)

    const AliceAfter = await Ct.balanceOf.call(alice, TokenID)
    console.log("balance: " + AliceAfter)
    //assert.equal(AliceAfter, 2)
    const BobAfter = await Ct.balanceOf.call(bob, TokenID)
    console.log("balance: " + BobAfter)
    //assert.equal(BobAfter, 1)*/
  })

  const TitLe21 = '***(21)_ReplicateB 테스트'
  /*it(TitLe21, async () => {
    console.log(TitLe21)
    await Ct.mintX('타이틀', 0, '해쉬값', 10)
    const Tx = await Ct.mintX_withTokenID(0, 20)

    //assertEventVar(Tx, 'NewCToken', 'titLe', '타이틀')
    //assertEventVar(Tx, 'NewCToken', 'cid', 0)
    //assertEventVar(Tx, 'NewCToken', 'hash', '해쉬값')

    var TokenIDs = await Ct.GetTokenSByContentProvider(alice)
    for (let i = 0; i < TokenIDs.length; i++) {
      console.log('[' + i + ']: ' + TokenIDs[i])
    }
  })*/
})
