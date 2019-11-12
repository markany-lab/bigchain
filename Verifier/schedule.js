var express = require('express');
var cors = require('cors');
var bodyParser = require('body-parser');
var app = express();
var Utils = require('ethereumjs-util');
var Web3 = require('web3');
var jsonBChannel = require('../TruffLeBToken/build/contracts/BChannel.json')
var Nacl = require('tweetnacl')
var fs = require('fs')
const path = require('path')
var multer = require('multer');
var dateUtils = require('date-utils');
var merkle = require('merkle');

var appConstants = require('./appConstant');
var appUtil = require('./apputil.js');
const FileBit = require('./aggUtil.js')

const cluster = require('cluster');
const numCPUs = require('os').cpus().length;
const process = require('process');
//cluster.schedulingPolicy = cluster.SCHED_NONE;

var Log4JS = require('log4js');
var Env = require('./.env.json');
var Logger ;

var mysql_dbc = require('./db_con');
var dbPool ;


const {
  Client,
  LocalAddress,
  LoomProvider,
  CryptoUtils,
} = require('loom-js/dist')
// const {
//   NonceTxMiddleware,
//   SignedTxMiddleware,
//   Client,
//   Address,
//   LocalAddress,
//   LoomProvider,
//   CryptoUtils,
//   Contracts,
//   Web3Signer
// } = require('loom-js/dist')


//상수값  정의
const _programName = "Verifier"
const _programVersion = "1.0.0.1"
// 인자값 정의
var _httpPort = 55444
var _httpsPort = 55445
var _procCnt = 10
var _homePath = ""
var _isRunMode = ""
var _isRunNode = ""

// 내부 변수
var _logHome = __dirname
var _uploadHome = __dirname + "/upload"

var settleManagerReady = true
var channelManagerReady = true

// 인자값 분석
getParam();

//홈디렉토리 설정
setHomePath();

//로그 설정
setLogger();



//==============================
// db connect test
let rst = dbInit()
if( rst == false ) {
  main_stop()
  return false
}else{
  Logger.info("db connect test ok!")
}

const PrivateKey = CryptoUtils.B64ToUint8Array('iCiGlOSClr3ZuZjFHVN/ia+weW7Rxg/QBsNlLyv2WO8fGa+24uMV1FeVe3GJI5uB3PQaPfbVQtd64qRI5j/oLg==')
const PubLicKey = CryptoUtils.publicKeyFromPrivateKey(PrivateKey)

const CLient = new Client(
  'extdev-plasma-us1',
  'wss://extdev-plasma-us1.dappchains.com/websocket',
  'wss://extdev-plasma-us1.dappchains.com/queryws'
)
const WWW3 = new Web3(new LoomProvider(CLient, PrivateKey))

const Addr = LocalAddress.fromPublicKey(PubLicKey).toString()
const NetworkID = Object.keys(jsonBChannel.networks)[0]
const BChannelCon = new WWW3.eth.Contract(
  jsonBChannel.abi,
  jsonBChannel.networks[NetworkID].address, {
    Addr
  }
)

//------------------------------------------------------------------------
//------------------------------------------------------------------------
function getUsage() {
  console.log( "Usage : verifier [option] [option value]");
  console.log( "   -win32                  Use users folder(only windows os)");
  console.log( "   -homePath [home path]   Set Home path" );
  console.log( "   -mode [mode]            Set Run Mode" );
  console.log( "       mode: a             Run settle mode and aggregate mode" );
  console.log( "       mode: s             Run settle mode " );
  console.log( "       mode: g             Run aggregate mode " );
}

function getParam() {
  let getParmIdx=0;
  for( getParmIdx=0 ; getParmIdx < process.argv.length ; getParmIdx++ ) {
    if( process.argv[getParmIdx] == "-help" ||process.argv[getParmIdx] == "-?" ) {
      getUsage();
      main_stop();
      return;
    }
    if( process.argv[getParmIdx] == "-win32" ) {
      _isRunNode = process.argv[getParmIdx]
    }
    if( process.argv[getParmIdx] == "-homePath" ) {
      _homePath = process.argv[getParmIdx+1];
      getParmIdx++;
    }
    if( process.argv[getParmIdx] == "-mode" ) {
      _isRunMode = process.argv[getParmIdx+1];
      getParmIdx++;
    }
    if( process.argv[getParmIdx] == "-ProcNo" ) {
      if( process.argv[getParmIdx+1].toLowerCase() == "max") {
        _procCnt = numCPUs;
      }else{
        _procCnt = parseInt( process.argv[getParmIdx+1] );
      }

      getParmIdx++;
    }
  }
}

function safeMakeFolder( fol ) {
  if( !fs.existsSync( fol ) ) {
    fs.mkdirSync(fol)
    // var mkdirp = require('mkdirp')
    // await  mkdirp('./omg', function(err){
    //    console.log(err); });
    }
}

function setHomePath() {
  if( _homePath == "" ) {
    if(_isRunNode == "-win32"  ){
        if( process.platform == "win32" ){
            let _localHome = require('os').homedir()
            _localHome += path.sep + "AppData" +  path.sep +"LocalLow" + path.sep + _programName
            _homePath = _localHome
        }else {
          _homePath =  path.dirname( process.argv[0] )
        }
    }else if( path.win32.basename(process.argv[0]) == "node" || path.win32.basename(process.argv[0]) == "node.exe" ){
      _homePath =  __dirname
    }else {
      _homePath =  path.dirname( process.argv[0] )
    }
  }
  // 기본 폴더 만들기
  safeMakeFolder(_homePath )  // 제품 홈디렉토리
  _logHome = _homePath + path.sep +"logs"
   safeMakeFolder(_logHome ) // 로그 폴더
}

function setLogger() {
	// 로그 설정
  Log4JS.configure({
     appenders: { Verifier: { type: 'file', filename: _logHome + '/schedule_' + _isRunMode + '.log'
        , maxLogSize: 524288, backups: 2, compress: true }
      },
     categories: { default: { appenders: ['Verifier'], level: 'error' } }
  })

  Logger = Log4JS.getLogger('Verifier')
  Logger.level = Env.log_level
}

async function main_stop() {
  await process.exit(1);
}

//==============================
// db connect

async function dbInit() {
  var dbStatus = true;
  dbPool = await  mysql_dbc.init();
  const rst = await  mysql_dbc.sim_query('SELECT 1 from dual',  null)
  if( rst == null ) {
    console.log('db error :' + await mysql_dbc.getErrMsg() );
    Logger.debug('db error :' + await mysql_dbc.getErrMsg() );
    return false;
  }
  return true;
}

/*
async function verifySignature(signB64, publicKeyB64) {
  const sign = CryptoUtils.B64ToUint8Array(signB64)
  const publicKey = CryptoUtils.B64ToUint8Array(publicKeyB64)
  const msgBytes = Nacl.sign.open(sign, publicKey)
  const msg = JSON.parse(Buffer.from(msgBytes.buffer, msgBytes.byteOffset, msgBytes.byteLength).toString())

  const oTokenInfo = await BChannelCon.methods.getChannelDetails(msg.channelId).call({ from: Addr })
  const receiver = oTokenInfo[0]
  const publicKeyOwner = LocalAddress.fromPublicKey(publicKey).toString()
  if (receiver.toLowerCase() != publicKeyOwner.toLowerCase()) {
    Logger.error("# verification failed: ")
    Logger.error(" - receiver: " + receiver.toLowerCase())
    Logger.error(" - pub_key owner: " + publicKeyOwner.toLowerCase())
    return { code: -1, err: "this receipt is not signed by receiver" }
  }
  return { code: 1, msg, channelInfo: oTokenInfo }
}

async function aggregateReceipt(msg) {
  const sender = msg.sender.toLowerCase()
  const channelPath = aggregatePath + msg.channelId + '/'
  if (!fs.existsSync(channelPath)) {
    fs.mkdirSync(channelPath)
  }

  const timestamp = Date.now()
  const managerPath = channelPath + 'aggregate_manager.json'
  const fileName = channelPath + sender + '_' + timestamp + '.json'
  var channelManager = JSON.parse(fs.readFileSync(channelManagerPath, 'utf8'))
  if (!fs.existsSync(managerPath)) {
    channelManager.open.push(msg.channelId)
    fs.writeFileSync(channelManagerPath, JSON.stringify(channelManager))
    fs.writeFileSync(fileName, JSON.stringify(msg))
    var manager = {}
    manager[sender] = timestamp
    fs.writeFileSync(managerPath, JSON.stringify(manager))
  } else {
    var manager = JSON.parse(fs.readFileSync(managerPath, 'utf8'))
    var senders = Object.keys(manager)
    if (senders.indexOf(sender) == -1) {
      fs.writeFileSync(fileName, JSON.stringify(msg))
      manager[sender] = timestamp
      fs.writeFileSync(managerPath, JSON.stringify(manager))
    } else {
      var priorFile = JSON.parse(fs.readFileSync(channelPath + sender + '_' + manager[sender] + '.json', 'utf8'))
      if (parseInt(priorFile.chunks) < parseInt(msg.chunks)) {
        fs.writeFileSync(fileName, JSON.stringify(msg))
        manager[sender] = timestamp
        fs.writeFileSync(managerPath, JSON.stringify(manager))
      } else {
        return { code: -1, err: "prior receipt is latest" }
      }
    }
  }
  return { code: 1 }
}
*/

//스케줄러
async function manageChannel() {
  Logger.debug("=======================================")
  Logger.debug("channelManager start")
  if (!channelManagerReady) {
    Logger.debug("channelManager in progress")
    return
  }
  channelManagerReady = false   //중복 스케줄러 처리 방지

  try {
    try {
      const connection = await dbPool.getConnection(async conn => conn);
      try {
        // await connection.beginTransaction() // START TRANSACTION

        //master table read receive receipt
        const m_query  = "select M_INFO_SEQ,CHANNEL_ID,PURCHASE_ID,C_STATUS,TOT_FILE_CNT,TOT_CHUNK_CNT,"
                + "RCV_PUB_KEY,CCID,CCID_VER,OPEN_DATE,CLOSE_DATE ,ONCHAIN_DATE ,MERKLE_ROOT ,CHANNEL_FILE ,REG_DATE "
                + " from ma_lst_master where C_STATUS = '2' "

        //master table 전송 미완료건을 찾는다.
        var [rows] = await connection.query( m_query, null )
        Logger.debug("total channel receive count:" + rows.length )
        for( i=0 ; i<rows.length ; i++ ) {
          Logger.debug("channel receive check, channelid:" + rows[i].CHANNEL_ID  )
          //step1 전송 미완료 채널의 청크 목록을 가져온다.
          const c_query  = "select C_CHUNK_SEQ, M_INFO_SEQ, C_FILE_ID, CHUNKS_INDEX, CHUNK_CNT "
                            + "from ma_chunk_info where  M_INFO_SEQ = ? and RCV_STATUS = ? "
          var [c_rows] = await connection.query( c_query, [rows[i].M_INFO_SEQ, appConstants.req_STATUS_READY] )
          Logger.debug("--file count :" + c_rows.length )
          //step2 파일별 처리
          for( j=0 ; j<c_rows.length ; j++ ){
            if( c_rows[j].CHUNKS_INDEX == null || c_rows[j].CHUNKS_INDEX == "" ) {
              continue;
            }

            //step3 청크 목록 정리
            var fileBit = FileBit.getInstance()
            // fileBit.init(2000);
            var filechunkMax = await appUtil.getMaxValue( c_rows[j].CHUNKS_INDEX )
            fileBit.init(filechunkMax+1);


            Logger.debug("----file chunk Info :" + c_rows[j].CHUNKS_INDEX )
            var arrayInfo = c_rows[j].CHUNKS_INDEX.split(",")
            Logger.debug("----file chunk arrayInfo :" + arrayInfo.length )
            for( k=0 ; k < arrayInfo.length ; k++ ) {
              Logger.debug("----file chunk arrayInfo chunk :" + arrayInfo[k] )
              if( arrayInfo[k] == null || arrayInfo[k].length == 0 ) {
                continue;
              }
              var aInfo = arrayInfo[k].split("-")
              Logger.debug("----file chunk arrayInfo chunk range:" + aInfo.length)
              Logger.debug("----file chunk arrayInfo chunk :" + aInfo[0] + " , " +aInfo[1] )
              if( aInfo.length == 1 ) {
                fileBit.setChunkBit( parseFloat( arrayInfo[k] ) )
              }else{
                fileBit.setChunkBitRang( parseFloat(aInfo[0]), parseFloat(aInfo[1]) )
              }
            }
            var chunk_org = fileBit.serializeChunk()
            Logger.debug("----file chunk arrayInfo count :" + k )

            // step4 파일별 전송영수증을 읽는다.
            const d_query2  = "select RECEIPT_SEQ, M_INFO_SEQ, SENDER_ID, RECEIVER_ID, C_FILE_ID, CHUNKS_INDEX, MERKLE_HASH,"
                            +" FILE_NAME, RECV_DATE"
                            +" from ma_receipt_info where M_INFO_SEQ = ? and C_FILE_ID = ? "
            Logger.debug("----receive receipt d_query2 :" + d_query2 )
            Logger.debug("----receive receipt C_FILE_ID :" + c_rows[j].C_FILE_ID )

            var [d_rows] = await connection.query( d_query2, [c_rows[j].M_INFO_SEQ, c_rows[j].C_FILE_ID] )

            Logger.debug("----receive receipt count :" + d_rows.length )
            var r_fileBit = FileBit.getInstance()
            r_fileBit.init(filechunkMax+1);

            // step5 파일별 전송영수증의 청크 정리
            for( k=0 ; k<d_rows.length ; k++ ){
              if( d_rows[k].CHUNKS_INDEX == null && d_rows[k].CHUNKS_INDEX == "" ) {
                continue
              }
              Logger.debug("----receive receipt chunk :" + d_rows[k].CHUNKS_INDEX )
              //전송영수증 청크 정리
              var r_arrayInfo = d_rows[k].CHUNKS_INDEX.split(",")
              Logger.debug("----receive receipt chunk count :" + r_arrayInfo.length )
              for( l=0 ; l < r_arrayInfo.length ; l++ ) {
                var rInfo = r_arrayInfo[l].split("-")
                if( rInfo.length == 1 ) {
                  r_fileBit.setChunkBit( parseFloat( r_arrayInfo[l] ) )
                }else{
                  r_fileBit.setChunkBitRang( parseFloat(rInfo[0]), parseFloat(rInfo[1]) )
                }
              }
            }

            Logger.debug("----receive receipt count :" + k )
            var chunk_receipt = r_fileBit.serializeChunk()
            // Logger.debug(  "----receive receipt chunk_receipt :" + chunk_receipt )
            //   Logger.debug("----receive receipt chunk_org     :" + chunk_org )
            //step6 파일별 수신완료 여부 체크
            if( chunk_receipt == chunk_org) {
              //전송영수증 수신완료되었어요...
              Logger.debug("----file receive receipt complate.  :"   )
              const u_query  = "update ma_chunk_info set  RCV_STATUS = ? where C_CHUNK_SEQ = ? "
              var rst = await connection.query( u_query, [appConstants.req_STATUS_COMPLETE,c_rows[j].C_CHUNK_SEQ ] )
            }
          } //for( j=0 ; j<c_rows.length ; j++ ) loop


          //step7 현재 채널이 모두 수신완료 되었는지 검사한다.
          const ch_query  = "select RCV_STATUS, count(1) as cnt from ma_chunk_info "
                          + " where  M_INFO_SEQ = ? group by RCV_STATUS "

          Logger.debug("--check channel's all receipt received. :"  + ch_query )
          var [ch_rows] = await connection.query( ch_query, [rows[i].M_INFO_SEQ] )
          var comp_cnt = 0
          var remain_cnt = 0
          for( l=0 ; l<ch_rows.length ;l++ ){
            if(ch_rows[l].RCV_STATUS == appConstants.req_STATUS_READY ) {
              remain_cnt = ch_rows[l].cnt
            }else if(ch_rows[l].RCV_STATUS == appConstants.req_STATUS_COMPLETE ) {
              comp_cnt =  ch_rows[l].cnt
            }
          }

          Logger.debug("--check channel's all receipt received. comp_cnt  :"  + comp_cnt + ", remain_cnt:" + remain_cnt )
          if( remain_cnt == 0 && comp_cnt > 0 ) {
            // murkle root 계산
            const hash_query  = "select MERKLE_HASH from ma_receipt_info  where M_INFO_SEQ = ? " +
                      " order by RECEIPT_SEQ "
            let [hash_rows] = await connection.query( hash_query, [rows[i].M_INFO_SEQ] )

            let murkle_data = []
            for( mur_i=0 ; mur_i<hash_rows.length ;mur_i++ ) {
              murkle_data.push(hash_rows[mur_i].MERKLE_HASH)
            }

            let use_uppercase = false;  //only toLowerCase
            let merkletree = merkle('sha256', use_uppercase).sync(murkle_data);
            Logger.debug("merkletree :" + merkletree.root() )
            //현재 채널이 모두 받았음
            const ag_query  = "update ma_lst_master set C_STATUS = ?, MERKLE_ROOT = ? where M_INFO_SEQ = ?  "
            var rst = await connection.query( ag_query, [appConstants.M_STATUS_RECEIPT_COMPLETE,merkletree.root(), rows[i].M_INFO_SEQ ] )

            Logger.debug("channel close. CHANNEL_ID:" + rows[i].CHANNEL_ID )
          }
        } //for( i=0 ; i<rows.length ; i++ ) loop

        // await connection.commit(); // COMMIT
        connection.release();

      } catch(err) {
        // await connection.rollback(); // ROLLBACK
        connection.release();
        Logger.debug('Query Error ' + err );
      }
    } catch(err) {
      Logger.debug('DB Error');
    }

    /*
    const channelManager = JSON.parse(fs.readFileSync(channelManagerPath, 'utf8'))
    let open = channelManager.open
    let off = channelManager.off

    for (var i = 0; i < open.length; i++) {
      const channelInfo = await BChannelCon.methods.getChannelDetails(open[i]).call({ from: Addr })
      const productId = channelInfo[1]
      const productInfo = await BChannelCon.methods.getProductDetails(productId).call({from: Addr})
      const fileInfo = await BChannelCon.methods.getFileDetails(productInfo[1], productInfo[2], productInfo[3]).call({from: Addr})
      const chunks = fileInfo[1]
      const aggregateManager = JSON.parse(fs.readFileSync(aggregatePath + open[i] + '/aggregate_manager.json'))
      const senders = Object.keys(aggregateManager)

      var count = 0
      var countArr = []
      for (var j = 0; j < senders.length; j++) {
        const latestReceipt = JSON.parse(fs.readFileSync(aggregatePath + open[i] + '/' + senders[i] + '_' + aggregateManager[senders[i]] + '.json'))
        count += parseInt(latestReceipt.chunks)
        countArr.push(parseInt(latestReceipt.chunks))
      }

      Logger.debug("timeout: " + channelInfo[4])

      if (count == chunks || channelInfo[4] <= 0) {
        Logger.debug("sending contents complete")
        Logger.debug("off-chain close...")
        var receipt = await BChannelCon.methods.channelOff(open[i]).send({ from: Addr })
        Logger.debug("channel off receipt: " + JSON.stringify(receipt))
        Logger.debug("settle...")
        receipt = await BChannelCon.methods.settleChannel(open[i], senders, countArr).send({ from: Addr })
        Logger.debug("settle receipt: " + JSON.stringify(receipt))
        off.push(open[i])
        open.splice(i, i + 1)
        fs.writeFileSync(channelManagerPath, JSON.stringify({open, off}))
      }
    }
    */
    channelManagerReady = 1
  } catch (err) {
    Logger.error("error occured: " + err)
    channelManagerReady = 1
  }
    Logger.debug("channelManager end")
}


// 정산처리 및 채널 종료
async function settleChannel() {
  Logger.debug("=======================================")
  Logger.debug("settleChannel start.")
  if (!settleManagerReady) {
    Logger.debug("settleChannel in progress")
    return
  }
  settleManagerReady = false   //중복 스케줄러 처리 방지
  try {
    const connection = await dbPool.getConnection(async conn => conn);
    try {
      // await connection.beginTransaction() // START TRANSACTION

      //master table read receive receipt
      const m_query  = "select M_INFO_SEQ,CHANNEL_ID,PURCHASE_ID,C_STATUS,TOT_FILE_CNT,TOT_CHUNK_CNT,"
              + "RCV_PUB_KEY,CCID,CCID_VER,OPEN_DATE,CLOSE_DATE ,ONCHAIN_DATE ,MERKLE_ROOT ,CHANNEL_FILE ,REG_DATE "
              + " from ma_lst_master where C_STATUS = '3' "

      //master table 전송완료건을 찾는다.
      var [rows] = await connection.query( m_query, null )
      Logger.debug("total receive complate count:" + rows.length )
      for( i_rows=0 ; i_rows<rows.length ; i_rows++ ) {
        Logger.debug("=>channel receive check, channelid:" + rows[i_rows].CHANNEL_ID  )

        //(송신자,파일)별 청크갯수 구하기
        const c_query  = "select SENDER_ID, RECEIVER_ID, C_FILE_ID, GROUP_CONCAT( CHUNKS_INDEX ) as ALL_CHUNKS "
                        + " from ma_receipt_info where M_INFO_SEQ = ? group by SENDER_ID, RECEIVER_ID, C_FILE_ID "
        let [c_rows] = await connection.query( c_query, [rows[i_rows].M_INFO_SEQ] )
        Logger.debug("=>channel sender, file search count:" + c_rows.length  )
        for(j=0; j<c_rows.length; j++) {
          // Logger.debug("=>channel sender,file chunks:" + c_rows[j].ALL_CHUNKS  )
          let chunkMax = await appUtil.getMaxValue( c_rows[j].ALL_CHUNKS )
          // Logger.debug("=>channel sender,file max chunk:" + chunkMax  )
          var r_fileBit = FileBit.getInstance()
          r_fileBit.init( chunkMax+1 )

          var arrayInfo = c_rows[j].ALL_CHUNKS.split(",")
          for( k=0 ; k < arrayInfo.length ; k++ ) {
            var rInfo = arrayInfo[k].split("-")
            if( rInfo.length == 1 ) {
              r_fileBit.setChunkBit( parseFloat( arrayInfo[k] ) )
            }else{
              r_fileBit.setChunkBitRang( parseFloat(rInfo[0]), parseFloat(rInfo[1]) )
            }
          }
          let chunkCount = r_fileBit.getCount()
          Logger.debug("=>channel sender,file chunkCount:" + chunkCount  )

          const i_query_sel  = "select count(1) as cnt from ma_receipt_result where M_INFO_SEQ=? and SENDER_ID=? and C_FILE_ID=? "
          let [i_query_rows] = await connection.query( i_query_sel, [rows[i_rows].M_INFO_SEQ, c_rows[j].SENDER_ID, c_rows[j].C_FILE_ID] )

          const i_query  = "insert into ma_receipt_result ( "
                          + "M_INFO_SEQ, SENDER_ID, RECEIVER_ID, C_FILE_ID, CHUNKS_COUNT, COMP_DATE"
                          + " ) values ( ?, ?, ?, ? ,?,  now() )  "
          const i_query_up  = "update ma_receipt_result set  CHUNKS_COUNT = ?, COMP_DATE = now() "
                          + " where M_INFO_SEQ = ? and SENDER_ID=? and C_FILE_ID=? "
          if( i_query_rows[0].cnt <= 0 ) {
            await connection.query( i_query, [rows[i_rows].M_INFO_SEQ, c_rows[j].SENDER_ID, c_rows[j].RECEIVER_ID, c_rows[j].C_FILE_ID, chunkCount ] )
            Logger.debug("=>channel sender,file INSERT." )
          }else{
            await connection.query( i_query_up, [ chunkCount, rows[i_rows].M_INFO_SEQ, c_rows[j].SENDER_ID,  c_rows[j].C_FILE_ID ] )
            Logger.debug("=>channel sender,file UPDATE." )
          }

        } //end of for(j=0; j<c_rows.length; j++)


        // 정산처리, 채널 닫자
        const r_query  = "select SENDER_ID, sum(CHUNKS_COUNT) as TOTAL_SEND "
                        + " from ma_receipt_result where M_INFO_SEQ = ? group by SENDER_ID "
        let [r_rows] = await connection.query( r_query, [rows[i_rows].M_INFO_SEQ] )
        Logger.debug("=>settleChannel count :" + r_rows.length )
        var senderLists = []
        var chunkLists = []
        for (l=0; l<r_rows.length ; l++) {
          senderLists[l] = r_rows[l].SENDER_ID
          chunkLists[l] = r_rows[l].TOTAL_SEND
        }
        Logger.debug("=>senderLists :" + senderLists )
        Logger.debug("=>chunkLists :" + chunkLists )
        Logger.debug("=>rows[i_rows].CHANNEL_ID :" + rows[i_rows].CHANNEL_ID )
        Logger.debug("=>rows[i_rows].MERKLE_ROOT :" + rows[i_rows].MERKLE_ROOT )

        try {
          await BChannelCon.methods.settleChannel( rows[i_rows].MERKLE_ROOT, rows[i_rows].CHANNEL_ID,  senderLists, chunkLists ).send({ from: Addr })
        } catch(err) {
          Logger.debug('settleChannel Error ' + err );
          continue;
        }

        const ag_query  = "update ma_lst_master set C_STATUS = ? where M_INFO_SEQ = ?  "
        var rst = await connection.query( ag_query, [appConstants.M_STATUS_CALCULATION_COMPLETE, rows[i_rows].M_INFO_SEQ ] )

        Logger.debug("settle receipt: " + rows[i_rows].CHANNEL_ID )
      } //end of for( i=0 ; i<rows.length ; i++ )

      // await connection.commit(); // COMMIT
      connection.release();
    } catch(err) {
      await connection.rollback(); // ROLLBACK
      connection.release();
      Logger.debug('Query Error ' + err );
    }
  } catch (err) {
    Logger.error("error occured: " + err)
  }
  settleManagerReady = true
  Logger.debug("settleChannel end.")
}

if( _isRunMode == "a" || _isRunMode == 'g') {
    setInterval(manageChannel, 1000)
}

if( _isRunMode == "a" || _isRunMode == 's') {
  setInterval(settleChannel, 1000)
}
