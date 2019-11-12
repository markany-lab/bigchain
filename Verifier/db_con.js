// var mysql = require('mysql');
const mysql = require('mysql2/promise');
var config = require('./db_info').local;

var pool ;
var errorMsg ;
module.exports = class _DbInit {
  static async init(  parm ) {
    pool = mysql.createPool({
      host: config.host,
      port: config.port,
      user: config.user,
      password: config.password,
      database: config.database,
      connectionLimit : 50
    });
    return pool;
  }
  static async getErrMsg ( )  {
    return errorMsg;
  }
  static async sim_query ( query, values )  {
    try {
  		const connection = await pool.getConnection(async conn => conn);
  		try {
  			const [rows] = await connection.query( query, values );
  			connection.release();
  			return rows;
  		} catch(err) {
  			//console.log('Query Error');
  			connection.release();
        errorMsg = err;
  			return null;
  		}
  	} catch(err) {
  		//console.log('DB Error' + err);
      errorMsg = err;
  		return null;
  	}
  };
  static async tr_query ( query, values )  {
  	try {
  		const connection = await pool.getConnection(async conn => conn);
  		try {
  			await connection.beginTransaction(); // START TRANSACTION
  			const [rows] = await connection.query( query, values);
  			await connection.commit(); // COMMIT
  			connection.release();
  			return rows;
  		} catch(err) {
  			await connection.rollback(); // ROLLBACK
  			connection.release();
  			console.log('Query Error');
  			return false;
  		}
  	} catch(err) {
  		console.log('DB Error');
  		return false;
  	}
  };

}
