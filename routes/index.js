var express = require('express');
var router = express.Router();
var mongo = require('mongodb');
var monk = require('monk');

var db = monk('127.0.0.1:27017/longe_log');

router.get('/test_post', function(req, res, next) {
   
	res.render('test_post', { 
        title: 'test_post'
	});
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
                collection = db.get(req.params.collection);
                collection.insert(req.body, function (err, doc) {
                    if (err) res.json({ result: 0,  message: err });
                    else res.json({ result: 1,  message: 'Success.' });
                });
                
                var now = new Date();
                
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
