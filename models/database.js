const mysql = require('mysql');


// function connection(){
//     const db = mysql.createPool({
//         connectionLimit : 100, 
//         host: 'localhost',
//         user: 'root',
//         database: 'gigdb',
//         charset: 'utf8mb4'
//     });

//     console.log('=====DATABASE CONNECTED=====');
//     // const db = mysql.createPool({
//     //     connectionLimit : 100, 
//     //     host: 'mysql-58935-0.cloudclusters.net',
//     //     user: 'admin',
//     //     port: 18697,
//     //     password: 'TfGEdHy6',
//     //     database: 'gigdb',
//     //     charset: 'utf8mb4'
//     // });
   
//     return db;
// }

// module.exports = connection();
    
    

 const connection = mysql.createPool({
        connectionLimit : 4, 
        host: 'localhost',
        user: 'awinxcxu_doomur',
        password: 'N0bX?^$UZBsj',
        database: 'awinxcxu_doomur',
        charset: 'utf8mb4'
    });



    // let connection = mysql.createPool({
    //     connectionLimit : 2, 
    //     host: 'localhost',
    //     user: 'root',
    //     database: 'gigdb',
    //     charset: 'utf8mb4'
    // })

    connection.getConnection(function(error, pool){
        if(error) return console.log('error : ', error.message);
        console.log('Connected to the Mysql database')
        pool.release();
    })
 

    module.exports = connection;