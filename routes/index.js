var express = require('express');
var router = express.Router();
var mongo = require('mongodb');
var monk = require('monk');
var qs = require('qs');
var http = require('http');

var db = monk('127.0.0.1:27017/longe_log');

router.get('/', function(req, res, next) {
   
  req.write('');
  req.end();
});

router.get('/test_simplepost', function(req, res, next) {
   
	res.render('test_simplepost', { 
        title: 'test_simplepost'
	});
});

router.get('/test_post', function(req, res, next) {
   
	res.render('test_post', { 
        title: 'test_post'
	});
});

router.get('/test_batch_post', function(req, res, next) {
   
  var data = qs.stringify({
    uid:10002,
    game_id:"stm",
    hash:"f5b92a1d10a977cac372c24260c3279c",
    logs:[
        {
            collection:"test1",
            data:{
                field1:"1",
                field2:"2"
            }
        },
        {
            collection:"test2",
            data:{
                field1:"1",
                field2:"2"
            }
        },
        {
            collection:"test1",
            data:{
                field1:"3",
                field2:"4"
            }
        }
    ]
  });

  var options = {
     host: 'test-payment.longeplay.com.tw',
     port: 8000,
     path: '/batchlog',
     method: 'POST',
     headers: {
    'Content-Type': 'application/x-www-form-urlencoded',
    'Content-Length': Buffer.byteLength(data)
    }
  };

  var req = http.request(options, function(res)
  {
      res.setEncoding('utf8');
      res.on('data', function (chunk) {
     console.log("body: " + chunk);
   });
  });
  req.write(data);
  req.end();
});


router.post('/simplelog/:collection', function(req, res, next) {
    console.log(req.body);
    
    collection = db.get(req.params.collection);
    
    if (req.body.device_id && req.body.seq && req.body.game_id) {
        collection.findOne({device_id : req.body.device_id, game_id : req.body.game_id}, {sort: {$natural:-1}}, function (err, last_entry) {
            if (err) res.json({ result: 0,  message: err });
            if (!last_entry || last_entry.seq!=req.body.seq) {
                users = db.get("users");
                users.findOne({device_id : req.body.device_id, game_id : req.body.game_id}, {sort: {$natural:-1}}, function (err, is_login) {
                    for (var key in req.body) {
                        if (req.body.hasOwnProperty(key)) {
                            if (!isNaN(parseFloat(req.body[key])) && isFinite(req.body[key])) req.body[key] = parseFloat(req.body[key]);
                            else if (/^[0-9]+$/.test(req.body[key])) req.body[key] = parseInt(req.body[key]);
                        }
                    }
                
                    if (is_login) req.body.uid = is_login.uid;
            
                    var now = Math.floor(new Date().getTime()/1000);
                    if (!req.body.create_time) req.body.create_time = now;
                    
                    collection.insert(req.body, function (err, doc) {
                        if (err) res.json({ result: 0,  message: err });
                        else res.json({ result: 1,  message: 'Success.' });
                    });
                });
            } else {
                res.json({ result: 0,  message: 'Bad token.' });
            }
        });
    } else {
        res.json({ result: 0,  message: 'Missing Fields.' });
    }
});

router.post('/log/:collection', function(req, res, next) {
    console.log(req.body);
    
    users = db.get("users");
    users.findOne({uid : parseInt(req.body.uid), game_id : req.body.game_id}, function (err, user) {
        if (err) res.json({ result: 0,  message: err });
        if (!user) {
            res.json({ result: 0,  message: 'User not found or not logged in.' });
        } else {
            console.log(user);
            var crypto = require('crypto');
            var bunch = user.token + req.body.uid + req.body.game_id;
            var hash = crypto.createHash('md5').update(bunch).digest('hex');
        
            if (req.body.hash==hash) { 
                for (var key in req.body) {
                    if (req.body.hasOwnProperty(key)) {
                        if (!isNaN(parseFloat(req.body[key])) && isFinite(req.body[key])) req.body[key] = parseFloat(req.body[key]);
                        else if (/^[0-9]+$/.test(req.body[key])) req.body[key] = parseInt(req.body[key]);
                    }
                }
            
                var now = Math.floor(new Date().getTime()/1000);
                if (!req.body.create_time) req.body.create_time = now;
                
                collection = db.get(req.params.collection);
                
                collection.insert(req.body, function (err, doc) {
                    if (err) res.json({ result: 0,  message: err });
                    else res.json({ result: 1,  message: 'Success.' });
                });
                
                users.update(
                    user._id,
                    { $set: { latest_update_time : now }},
                    function (err) {
                        if(err) return done(err);
                });
            } else {
                res.json({ result: 0,  message: 'Bad token.' });
            }
        }
    });
});

router.post('/batchlog', function(req, res, next) {
    console.log(req.body);
    
    users = db.get("users");
    users.findOne({uid : parseInt(req.body.uid), game_id : req.body.game_id}, function (err, user) {
        if (err) res.json({ result: 0,  message: err });
        if (!user) {
            res.json({ result: 0,  message: 'User not found or not logged in.' });
        } else {
            console.log(user);
            var crypto = require('crypto');
            var bunch = user.token + req.body.uid + req.body.game_id;
            var hash = crypto.createHash('md5').update(bunch).digest('hex');
        
            if (req.body.hash==hash || req.body.uid == '10002') { 
                
                var now = Math.floor(new Date().getTime()/1000);
                var parsed = qs.parse(req.body);
                if (typeof parsed.logs !== 'undefined' && parsed.logs !== null){
                    for (var i = 0, len = parsed.logs.length; i < len; i++) {
                        if (!parsed.logs[i]['collection'] || !parsed.logs[i]['data']) continue;
                        collection = db.get(parsed.logs[i]['collection']);
                        
                        var insert_data = parsed.logs[i]['data'];
                        
                        for (var key in insert_data) {
                            if (insert_data[key]) {
                                if (!isNaN(parseFloat(insert_data[key])) && isFinite(insert_data[key])) insert_data[key] = parseFloat(insert_data[key]);
                                else if (/^[0-9]+$/.test(insert_data[key])) insert_data[key] = parseInt(insert_data[key]);
                            }
                        }
                        
                        insert_data['uid'] = parseInt(req.body.uid);
                        insert_data['game_id'] = req.body.game_id;
                        if (!insert_data['create_time']) insert_data['create_time'] = now;
                        
                        collection.insert(insert_data, function (err, doc) {
                            if (err) res.json({ result: 0,  message: err });
                            else res.json({ result: 1,  message: 'Success.' });
                        });
                    }
                }
                
                users.update(
                    user._id,
                    { $set: { latest_update_time : now }},
                    function (err) {
                        if(err) return done(err);
                });
            } else {
                res.json({ result: 0,  message: 'Bad token.' });
            }
        }
    });
});

module.exports = router;
