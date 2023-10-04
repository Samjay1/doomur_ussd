const mysql = require('mysql')
const database = require('./database')

const oldDate = new Date()
var date = oldDate.toISOString().split('T')[0];
var time  = new Date().toLocaleTimeString();  

class show_db {
    constructor(){
        global.db = database;
    }

  

// --------------------------------------------------------------------------------
   
    //BOOK GIG
    book_show(show_id,unique_id,title,ticket_type,ticket_price,ticket_quantity,event_date,event_time,email,status,callback){
        let query = 'INSERT INTO booked_show (user_id,show_id,unique_id,title,ticket_type,ticket_price,ticket_quantity,event_date,event_time,email,status,date,time) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)'
        let value = [1000000,show_id,unique_id,title,ticket_type,ticket_price,ticket_quantity,event_date,event_time,email,status,date,time]
        try {
            db.query(query, value, (err, response) => {
              if (err) {
                  // throw err;
                return callback({ status: false, message: "error here: "+ err });
              }
              if (response.length === 0) {
                return callback({
                  status: false,
                  message: "Failed to book show",
                });
              } else {
                // console.log(" response", response);
                return callback({
                  status: true,
                  message: "Show booked",
                  response: response,
                });
              }
            });
          } catch (err) {
            return callback({
              status: false,
              message: "failed to book show",
            });
          } 
    }

// ADD PAYMENT
add_payment(unique_id,transaction_id,amount,other,phone,callback){
  let query = 'INSERT INTO payments (user_id,transaction_id,amount,payment_method,other,phone,status,date,time,type) VALUES (?,?,?,?,?,?,?,?,?,?)'
  let values = [1000000,transaction_id,amount,'MOMO',other,phone,'completed',date,time,'show'];
  console.log('add payment successful');
  try {
      db.query(query,values,(error,response)=>{
        if(error){
         
          // throw error;
          return callback({status:false, messages:"Error here "+ error})
        }else if(response.affectedRows !== 0){
          console.log('add payment successful');
          this.payment_completed_status(unique_id,transaction_id,amount,(res)=>{
            if(res.status===true){
              console.log('payment completed status successful');
              return callback({
                status: true,
                message: "Payment successful(complete)",
                other: res.message
              })
            }else{
              return callback({
                status: true,
                message: "Payment successful(status not updated - payment and book_show db)",
                other: response.message
              })
            }
          }) 
        }
      })
  } catch (error) {
    return callback({
      status: false,
      message: "failed add payment",
    });
  }
}


payment_completed_status(unique_id,transaction_id,paid, callback){
  let query = "UPDATE booked_show SET status=5, transaction_id=?, paid=? WHERE unique_id=?"
  try {
    db.query(query,[transaction_id,paid,unique_id], (error, response)=>{
      if(error){
        // throw error;
        return callback({status:false, messages:"Error here "+ error})
      }else if(response.length !== 0) {
        console.log('response :>> ', response);
          return callback({
          status: true,
          response: response[0],
          message: "Show status update successfully"
          });
      }else{
        return callback({
          status: false,
          message: "failed update status",
        });
      }
    })
  } catch (error) {
    return callback({
      status: false,
      message: "system: failed update status",
    });
  }
}
  

}


module.exports = show_db