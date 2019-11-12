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
var _isRunNode = ""

// 내부 변수
var _logHome = __dirname
var _uploadHome = __dirname + "/upload"

// 인자값 분석
getParam();

//홈디렉토리 설정
setHomePath();

//로그 설정
setLogger()

if (cluster.isMaster) {
  //==============================
  // db connect test
  let rst = dbInit()
  if( rst == false ) {
    main_stop()
    return false
  }else{
    Logger.debug("db connect test ok!")
  }
  console.log('ppid : ' + process.pid )

  let numReqs = 0;

  // Count requests
  function messageHandler(msg) {
    if (msg.cmd && msg.cmd === 'notifyRequest') {
      numReqs += 1;
    }
  }

  // Start workers and listen for messages containing notifyRequest
  for (let i = 0; i < _procCnt; i++) {
    cluster.fork();
  }

  for (const id in cluster.workers) {
    cluster.workers[id].on('message', messageHandler);
  }

  cluster.on('exit', (worker, code, signal) => {
    console.log(`worker ${worker.process.pid} died`);
    cluster.fork();
  });

} else {

  let rst = dbInit()
  if( rst == false ) {
    Logger.debug("db connect test fail!")
  }else{
    Logger.debug("db connect test ok!")
  }

  //==============================
  //web service
  console.log('pid : ' + process.pid )
  Logger.debug('=======================================')
  Logger.debug('pid : ' + process.pid )

  app.use(cors());
  app.use(bodyParser.json());
  app.use(bodyParser.urlencoded({
    extended: true
  }));

  app.post('/preReq', async function (req, res) {
    try {
      Logger.debug('req: ' + JSON.stringify(req.body))
      res.json({
        resultCode: 0
      })
    } catch (err) {
      Logger.error("error occured: " + err)
      res.json({ resultCode: "500", result: "internal error" })
    }
  })

  let storage = multer.diskStorage({
      destination: function(req, file ,callback){

        const runenv = fs.readFileSync(_homePath + '/conf/runenv.json', 'utf8')
        let jsonEnv = JSON.parse(runenv)
        _uploadHome = jsonEnv.upFolder

        let dt = new Date();
        let today = dt.toFormat('YYYYMMDD');
        safeMakeFolder( _uploadHome + "/" + today  )
        Logger.debug("diskStorage: " + _uploadHome + "/" + today )
        callback(null,  _uploadHome + "/" + today  + "/")
      }
      // ,filename: function(req, file, callback){
      //   callback(null, file.fieldname + '-' + Date.now())
      // }
  });

  let upload = multer({ storage: storage });
  app.post('/channelOpen', upload.single('chunk_file'),  async function (req, res) {
    try {
      Logger.debug('-------------------------------------------')
      Logger.debug('channelOpen: ' + JSON.stringify(req.body))
      // Logger.debug('channelOpen req.file: ' + JSON.stringify(req.file) )
      let org_fname = req.file.originalname  //원본 파일명
      let save_dir = req.file.path        //저장된 파일명  (절대경로)
      let save_fname = req.file.filename  //저장된 파일명  (only filename)
      let save_size = req.file.size       //저장된 파일 사이즈
      let open_period = req.open_period       //OPEN 기간

      let array = fs.readFileSync(save_dir).toString().split("\r\n")
      let arrayInfo = array[0].split("/")
      let DataArray
      let totChunkCnt = 0
      let query
      try {
        const connection = await dbPool.getConnection(async conn => conn);
        try {
          await connection.beginTransaction() // START TRANSACTION
          //master table sequence generate
          let [rows] = await connection.query( "select nextval(m_info_seq) as indexs ", null )
          const mInfoSeq =  rows[0].indexs
          let chunkSeq = 0
          //chunks table insert sql
          query  = "insert into ma_chunk_info( "
                  + "C_CHUNK_SEQ, M_INFO_SEQ, C_FILE_ID, CHUNKS_INDEX, CHUNK_CNT, RCV_STATUS "
                  + " ) values ( ?, ?, ?, ? ,?, ?  )"

          let i = 0;
          let fileCount = 0;
          for(i=1 ; i< array.length ; i++) {
              DataArray = array[i].split( "\t")
              if(DataArray.length < 2 ) {
                continue
              }

                //chunks count
              let chunkCnt = await appUtil.countRangeString( DataArray[1] )
              totChunkCnt += chunkCnt
              let [rows1]  = await connection.query( "select nextval(c_chunk_seq)  as indexs", [] )
              chunkSeq =  rows1[0].indexs
              let datas1 = [ chunkSeq, mInfoSeq, DataArray[0], DataArray[1], chunkCnt,  appConstants.req_STATUS_READY ]

              //chunks table insert
              await connection.query( query, datas1 )
              fileCount ++
          }

          //master table insert sql
          query = "insert into ma_lst_master( " +
            "M_INFO_SEQ, CHANNEL_ID, PURCHASE_ID, C_STATUS,  TOT_FILE_CNT, TOT_CHUNK_CNT, RCV_PUB_KEY, OPEN_DATE, CHANNEL_FILE, REG_DATE, CCID, CCID_VER, OPEN_PERIOD "
            + " ) values ( ?, ?, ?, ?, ?, ?, ?, now(), ?, now(), ?,?, DATE_ADD(NOW(), INTERVAL 1 SECOND) )"
          let datas2 = [ mInfoSeq, req.body.channel_id ,  req.body.purchase_id, appConstants.M_STATUS_CHANNEL_OPEN, fileCount, totChunkCnt, req.body.s_pubkey,  save_dir, arrayInfo[0], arrayInfo[1] ]
          let rst = await connection.query( query, datas2 );

          await connection.commit(); // COMMIT
          connection.release();

          Logger.debug("channel open process succeed: fileCount:" + fileCount + ", chunkCnt:" + totChunkCnt + ", m_seq:" + mInfoSeq + ",channel_id:" + req.body.channel_id)

        } catch(err) {
          await connection.rollback(); // ROLLBACK
          connection.release();
          console.log('Query Error ' + err );
          res.json({ resultCode: "500", resultMsg: "internal error:" + err })
        }
      } catch(err) {
        console.log('DB Error');
        res.json({ resultCode: "500", resultMsg: "internal error:" + err })
      }

      res.json({ resultCode: "0", msg: "aggregate complete", chunkCnt: totChunkCnt })
    } catch (err) {
      Logger.error("error occured: " + err)
      res.json({ resultCode: "500", resultMsg: "internal error:" + err })
    }
  })

  app.post('/receiveReceipt', async function (req, res) {
    try {
      Logger.debug('receiveReceipt: ' + JSON.stringify(req.body))

      //verify sender sign value
      let rst = appUtil.vrfDSignVal( req.body.receipt, req.body.s_sign, req.body.s_pubkey )
      if( rst == false ) {
        res.json({ resultCode: "500", msg: "sender sign verify fail." })
        return;
      }

      let dt = new Date()
      let runenv = fs.readFileSync(_homePath + '/conf/runenv.json', 'utf8')
      let jsonEnv = JSON.parse(runenv)
      let receiptHome = jsonEnv.receiptFolder + "/"+ dt.toFormat('YYYYMMDD')
      safeMakeFolder( receiptHome  )

      let receiptFile = receiptHome  + "/"+ req.body.file_id
      fs.writeFileSync( receiptFile, JSON.stringify(req.body), "utf8" )

      try {
        const connection = await dbPool.getConnection(async conn => conn);
        try {
          await connection.beginTransaction() // START TRANSACTION

          let [rows1]  = await connection.query( "select nextval(receipt_seq) as indexs", [] )
          let receiptSeq =  rows1[0].indexs

          Logger.debug("receiptSeq:" + receiptSeq )

          let [rows] = await connection.query( "select M_INFO_SEQ, C_STATUS  from ma_lst_master where CHANNEL_ID = ? ", [req.body.channel_id] )
          const mInfoSeq =  rows[0].M_INFO_SEQ

          Logger.debug("mInfoSeq:" + mInfoSeq )
          if( rows[0].C_STATUS == '3') {
            await connection.commit(); // COMMIT
            connection.release();
            console.log('Query Error ' + err );
            res.json({ resultCode: "100", resultMessage: "This channel is already settled."})
          }

          //chunks table insert sql
          let query  = "insert into ma_receipt_info( "
                  + "RECEIPT_SEQ, M_INFO_SEQ, SENDER_ID, RECEIVER_ID, C_FILE_ID, CHUNKS_INDEX, MERKLE_HASH, FILE_NAME, RECV_DATE"
                  + " ) values ( ?, ?, ?, ? ,?, ?, ? ,?, now() )"

          Logger.debug("query:" + query )
          let merkleHash = await appUtil.getSha256( req.body.receipt )
          Logger.debug("merkleHash:" + merkleHash )
          let datas1 = [ receiptSeq, mInfoSeq, req.body.from_id, req.body.to_id, req.body.file_id, req.body.chunks, merkleHash, receiptFile ]
          Logger.debug("datas:" + datas1 )
          await connection.query( query, datas1 )

          //master table insert sql
          query = "update ma_lst_master set  C_STATUS = ? where M_INFO_SEQ = ? and C_STATUS = '1' "
          let datas2 = [ appConstants.M_STATUS_RECEIPT_RECEIVE, mInfoSeq ]
          let rst = await connection.query( query, datas2 );

          await connection.commit(); // COMMIT
          connection.release();

          Logger.debug("receiveReceipt succeed. channel_id:" + req.body.channel_id + "" )

        } catch(err) {
          await connection.rollback(); // ROLLBACK
          connection.release();
          console.log('Query Error ' + err );
          res.json({ resultCode: "500", resultMessage: "internal error:" + err })
        }
      } catch(err) {
        console.log('DB Error');
        res.json({ resultCode: "500", resultMsg: "internal error:" + err })
      }

      res.json({ resultCode: "0", msg: "aggregate complete" })
    } catch (err) {
      Logger.error("error occured: " + err)
      res.json({ resultCode: "500", resultMsg: "internal error" + err })
    }
  })


  //==============================
  // http server
  app.listen(_httpPort, () => {
    Logger.info('http server listening on port ' + _httpPort);
  });

  //==============================
  // https server
  var https = require('https')
  var OptionS = {
    method : 'POST',
    key: Env.server_key,
    cert: Env.server_crt,
    ca: Env.rootca_crt
  }

  var HttpsServ = https.createServer(OptionS, app).listen(_httpsPort, function(){
    Logger.info("https server listening on port " + _httpsPort)
  })
  HttpsServ.timeout = 240000

} //end of worker


//------------------------------------------------------------------------
//------------------------------------------------------------------------
function getUsage() {
  console.log( "Usage : verifier [option] [option value]");
  console.log( "   -win32                  Use users folder(only windows os)");
  console.log( "   -homePath [home path]   Set Home path" );
  console.log( "   -httpPort [http port]   Set http port" );
  console.log( "   -httpsPort [https port] Set https port" );
  console.log( "   -ProcNo [process count] Set process count" );
  console.log( "           process count : 0~cpu number" );
  console.log( "                           'max' = cpu number" );
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
    if( process.argv[getParmIdx] == "-httpPort" ) {
      _httpPort = parseInt( process.argv[getParmIdx+1] );
      getParmIdx++;
    }
    if( process.argv[getParmIdx] == "-httpsPort" ) {
      _httpsPort = parseInt( process.argv[getParmIdx+1] );
      getParmIdx++;
    }
    if( process.argv[getParmIdx] == "-homePath" ) {
      _homePath = process.argv[getParmIdx+1];
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

function setLogger( ) {
	// 로그 설정
  Log4JS.configure({
     appenders: { Verifier: { type: 'file', filename: _logHome + '/Verifier_.log', maxLogSize: 524288, backups: 2, compress: true }
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
  let dbStatus = true;
  dbPool = await  mysql_dbc.init();
  let rst = await  mysql_dbc.sim_query('SELECT 1 from dual',  null)
  if( rst == null ) {
    console.log('db error :' + await mysql_dbc.getErrMsg() );
    Logger.debug('db error :' + await mysql_dbc.getErrMsg() );
    return false;
  }
  return true;
}
