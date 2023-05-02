const mysql = require('mysql')
const database = require('./database')

class show_db {
    constructor(){
        global.db = database;
    }

    //GET ALL ADS
    get_ads( callback){
        let query = 'SELECT * FROM ads ORDER BY ad_count DESC LIMIT 10'
       
        try {
            db.query(query, (err, response) => {
              if (err) {
                //   throw err;
                return callback({ status: false, message: "error here: "+ err });
              }
              if (response.length === 0) {
                return callback({
                  status: false,
                  message: "Failed to get ads",
                });
              } else {
                // console.log(" response", response);
                return callback({
                  status: true,
                  message: "All ads requested",
                  response: response,
                });
              }
            });
          } catch (err) {
            return callback({
              status: false,
              message: "failed get ads",
            });
          } 
    }

    //GET FEATURED TODAY
    get_featured(callback){
        let query = 'SELECT id,title,description,paid_free,main_image FROM shows WHERE status="ACTIVATED" ORDER BY ads_count DESC LIMIT 10;'
       
        try {
            db.query(query, (err, response) => {
              if (err) {
                //   throw err;
                return callback({ status: false, message: "error here: "+ err });
              }
              if (response.length === 0) {
                return callback({
                  status: false,
                  message: "Failed to get featured",
                });
              } else {
                // console.log(" response", response);
                return callback({
                  status: true,
                  message: "All featured requested",
                  response: response,
                });
              }
            });
          } catch (err) {
            return callback({
              status: false,
              message: "failed get featured",
            });
          } 
    }

    //GET TRENDING TODAY
    get_trending(callback){
        let query = 'SELECT id,title,description,main_image FROM shows  WHERE status="ACTIVATED" LIMIT 10;'
       
        try {
            db.query(query, (err, response) => {
              if (err) {
                //   throw err;
                return callback({ status: false, message: "error here: "+ err });
              }
              if (response.length === 0) {
                return callback({
                  status: false,
                  message: "Failed to get trending",
                });
              } else {
                // console.log(" response", response);
                return callback({
                  status: true,
                  message: "All trending requested",
                  response: response,
                });
              }
            });
          } catch (err) {
            return callback({
              status: false,
              message: "failed get trending",
            });
          } 
    }
    
     //GET WEEKLY SHOWS
    get_weekly_shows(callback){
        let query = 'SELECT id,title,description,main_image FROM shows  WHERE status="ACTIVATED" LIMIT 10;'
       
        try {
            db.query(query, (err, response) => {
              if (err) {
                //   throw err;
                return callback({ status: false, message: "error here: "+ err });
              }
              if (response.length === 0) {
                return callback({
                  status: false,
                  message: "Failed to get weekly shows",
                });
              } else {
                // console.log(" response", response);
                return callback({
                  status: true,
                  message: "All weekly shows requested",
                  response: response,
                });
              }
            });
          } catch (err) {
            return callback({
              status: false,
              message: "failed get weekly",
            });
          } 
    }

     // GET ORGANISER BY ID SECTION ---------------------------------------------------------------------------
     get_organiser_by_id(id,callback) {
      let query = "SELECT id,organisation_name as organiser_name,organiser_image,username,phone_number as phone,first_name,last_name,email FROM users WHERE id=? AND NOT status=10";

      try {
          db.query(query,[id], (err, response) => {
              if (err) {
                  // throw err;
              return callback({ status: false, message: "error here " +err});
              }
              if (response.length === 0) {
              return callback({
                  status: false,
                  message: "User not registered",
              });
              } else {
              // console.log("organiser response", response[0]);
              return callback({
                  status: true,
                  message: "user exists",
                  response: response[0],
              });
              }
          });
      } catch (err) {
          return callback({
              status: false,
              message: "failed user login (email not in database)",
          });
      } 
  }

    //GET PREVIEW SHOW
    get_single_show(show_id, callback){
      let query = 'SELECT * FROM shows WHERE id=? LIMIT 1'
      let value = [show_id]
      try {
          db.query(query, value, (err, response) => {
            if (err) {
              //   throw err;
              return callback({ status: false, message: "error here: "+ err });
            }
            if (response.length === 0) {
              return callback({
                status: false,
                message: "Failed to  preview show",
              });
            } else {
              // console.log(" response", response);
              this.get_artists(show_id,(result)=>{
                  if(result.status===true){
                      return callback({
                          status: true,
                          message: "Preview show requested",
                          response: {
                              show:response[0] || null,
                              artist:result.response || {}
                          },
                        });
                  }
                  return callback({
                      status: true,
                      message: "Preview show requested",
                      response: {
                        show: response[0] ,
                        artist: null
                    }
                    });
              })
              
            }
          });
        } catch (err) {
          return callback({
            status: false,
            message: "failed preview show",
          });
        } 
    }


    //GET ARTIST FOR SHOW
    get_artists(show_id,callback){
        let query = 'SELECT * FROM artists WHERE show_id=?'
       let value = [show_id]
        try {
            db.query(query, value, (err, response) => {
              if (err) {
                //   throw err;
                return callback({ status: false, message: "error here: "+ err });
              }
              if (response.length === 0) {
                return callback({
                  status: false,
                  message: "Failed to get artists",
                });
              } else {
                // console.log(" response", response);
                return callback({
                  status: true,
                  message: "All trending artists",
                  response: response,
                });
              }
            });
          } catch (err) {
            return callback({
              status: false,
              message: "failed get artist",
            });
          } 
    }

    //GET ALL SHOWS
    get_all_shows(callback){
      let query = 'SELECT id,title,category,description,main_image,event_location,status, (total_tickets1 + total_tickets2 + total_tickets3) as total_tickets FROM shows WHERE status="ACTIVATED";'
      try {
          db.query(query, (err, response) => {
          
            if (err) {
              //   throw err;
              return callback({ status: false, message: "error here: "+ err });
            }
            if (response.length === 0) {
              return callback({
                status: false,
                message: "Failed to get shows",
              });
            } else {
             
              // console.log(" response", response);
              return callback({
                status: true,
                message: "All shows",
                response: response,
              });
            }
        
          });
        } catch (err) {
          return callback({
            status: false,
            message: "failed get shows",
          });
        } 
    }

    //GET ALL SHOWS
    get_shows(category,callback){
      let query = 'SELECT id,title,category,description,main_image,event_location, (total_tickets1 + total_tickets2 + total_tickets3) as total_tickets FROM shows WHERE category=? AND status="ACTIVATED";'
      let value = [category]
      try {
          db.query(query,value, (err, response) => {
            if (err) {
              //   throw err;
              return callback({ status: false, message: "error here: "+ err });
            }
            if (response.length === 0) {
              return callback({
                status: false,
                message: "Failed to get shows",
              });
            } else {
              // console.log(" response", response);
              return callback({
                status: true,
                message: "All shows",
                response: response,
              });
            }
          });
        } catch (err) {
          return callback({
            status: false,
            message: "failed get shows",
          });
        } 
    }


    //SEARCH SHOWS
    search_shows(value,callback){
      let query = "SELECT id,title,category,description,main_image,event_location, (total_tickets1 + total_tickets2 + total_tickets3) as total_tickets FROM shows WHERE status='ACTIVATED' AND title LIKE '%"+value+"%' OR category LIKE '%"+value+"%' OR event_location LIKE '%"+value+"%' OR description LIKE '%"+value+"%';"
      // let value = [category]
      try {
          db.query(query, (err, response) => {
            if (err) {
              //   throw err;
              return callback({ status: false, message: "error here: "+ err });
            }
            if (response.length === 0) {
              return callback({
                status: false,
                message: "Failed to search shows",
              });
            } else {
              // console.log(" response", response);
              return callback({
                status: true,
                message: "Searched shows",
                response: response,
              });
            }
          });
        } catch (err) {
          return callback({
            status: false,
            message: "failed to search shows",
          });
        } 
    }
// --------------------------------------------------------------------------------
   
    //BOOK GIG
    book_show(user_id,show_id,unique_id,title,ticket_type,ticket_price,ticket_quantity,event_date,event_time,voucher,fullname,status,transaction_id,date,time,callback){
        let query = 'INSERT INTO booked_show (user_id,show_id,unique_id,title,ticket_type,ticket_price,ticket_quantity,event_date,event_time,voucher,fullname,status,transaction_id,date,time) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)'
        let value = [user_id,show_id,unique_id,title,ticket_type,ticket_price,ticket_quantity,event_date,event_time,voucher,fullname,status,transaction_id,date,time]
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

      //GET USER BOOKED SHOWS
    get_booked_shows(user_id,callback){
        let query = 'SELECT * FROM booked_show WHERE user_id=?'
        let value = [user_id]
        try {
            db.query(query, value, (err, response) => {
              if (err) {
                //   throw err;
                return callback({ status: false, message: "error here: "+ err });
              }
              if (response.length === 0) {
                return callback({
                  status: false,
                  message: "Failed to get booked shows",
                });
              } else {
                // console.log(" response", response);
                return callback({
                    status: true,
                    message: "All booked shows",
                    response: response,
                    });
                
              }
            });
          } catch (err) {
            return callback({
              status: false,
              message: "failed get booked shows",
            });
          } 
    }
    

// ADD PAYMENT
add_payment(unique_id,user_id,show_id,transaction_id,amount,payment_method,other,phone,email,card_details,status,date,time,callback){
  let query = 'INSERT INTO payments (user_id,prof_id,transaction_id,amount,payment_method,other,phone,email,card_details,status,date,time,type) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)'
  let values = [user_id,show_id,transaction_id,amount,payment_method,other,phone,email,card_details,status,date,time,'show'];
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
                message: "Payment successful",
                other: res.message
              })
            }else{
              return callback({
                status: true,
                message: "Payment successful",
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
    

get_status(id, callback){
  let query = "SELECT status FROM booked_show WHERE unique_id=?"
  try {
    db.query(query,[id], (error, response)=>{
      if(error){
        // throw error;
        return callback({status:false, messages:"Error here "+ error})
      }else if(response.length !== 0) {
          return callback({
          status: true,
          response: response[0],
          message: "show status retrieved successfully"
          });
      }else{
        return callback({
          status: false,
          message: "failed get status",
        });
      }
    })
  } catch (error) {
    return callback({
      status: false,
      message: "system: failed get status",
    });
  }
}

}


module.exports = show_db