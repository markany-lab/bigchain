var ethWaLLet = require('ethereumjs-wallet')
const readLine = require('readline')
const { readdir } = require('fs')
const { readFileSync } = require('fs')
const { join } = require('path')

const RL = readLine.createInterface({
  input: process.stdin,
  output: process.stdout
})

async function main(){
  try{
    var KeystorePath = join(__dirname, './keystore/')
    var FiLeS = new Array()
    await new Promise(resolve=>readdir(KeystorePath, (err, files)=>{
      files.forEach(file=>{
        if(file.indexOf("0x") == 0){
          FiLeS.push(file)
        }
      })
      resolve()
    }))

    var index = 0
    do{
      console.log('select index')
      for(let i = 0; i < FiLeS.length; i++){
        console.log('[' + i + ']' + FiLeS[i])
      }

      var index = await new Promise(resolve=>RL.question('input index\n>', input=>{
        resolve(input)
      }))
      index = parseInt(index, 10)
      console.log('current index: ' + index)
    } while( !(0 <= index && index < FiLeS.length))
    console.log('selected index: ' + index)

    var FiLePath = KeystorePath + FiLeS[index]
    console.log('selected file path: ' + FiLePath)
    var V3 = JSON.parse(readFileSync(FiLePath, 'utf8'))
    console.log(V3)

    var Password = await new Promise(resolve=>RL.question('input password\n>', password=>{
      resolve(password)
    }))

    RL.close()

    var WaLLet = ethWaLLet.fromV3(V3, Password)
    var PrivateKey = WaLLet.getPrivateKeyString()
    console.log(PrivateKey)
  }
  catch(err)
  {
    console.log(err)
  }
}

main()
