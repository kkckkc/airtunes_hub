var net = require('net'),
		airtunes = require('airtunes'),
    argv = require('optimist')
      .usage('Usage: $0 --host [host] --port [num] --volume [num] --password [string]')
      .default('host', 'localhost')
      .default('port', 5000)
      .default('volume', 100)
      .demand(['host'])
      .argv;

var AUDIO_TIMEOUT = 2000,
		lastAudioPacketTimestamp = 0;


function AirTunes() {
	var connected = false,
		  disconnectHandler = 0;
	
	this.connect = function() {
		clearTimeout(disconnectHandler);

		if (connected) return;
		
		console.log("Connect");
		
		connected = true;
		
		var device = airtunes.add(argv.host, argv);

		device.on('error', function(err) {
		  console.log('device error: ' + err);
		  process.exit(1);
		});	
	},
	
	this.disconnect = function() {
		if (! connected) return;
		
		disconnectHandler = setTimeout(function() {
			connected = false;
		  console.log('stopping');
		  airtunes.stopAll(function () {
		    console.log('all stopped');
		  });
		}, 2000);
	};
	
	// monitor buffer events
	airtunes.on('buffer', function(status) {
	  console.log('buffer ' + status);

	  // after the playback ends, give AirTunes some time to finish
	  if(status === 'end') {
	    console.log('playback ended, waiting for AirTunes devices');
	    setTimeout(function() {
	      airtunes.stopAll(function() {
	        console.log('end');
	        process.exit();
	      });
	    }, 2000);
	  }
	});
}
var at = new AirTunes();


var server = net.createServer(function(c) {
	console.log("Server connected");
	
	at.connect();
	
	var timeoutHandler = setInterval(function() {
		if ((Date.now() - lastAudioPacketTimestamp) > AUDIO_TIMEOUT) {
			disconnect();
		}
	}, 1000);

	var disconnect = function() {
		console.log("Server disconnected");
		at.disconnect();
		c.end();
		clearTimeout(timeoutHandler);
	}
	
	c.on('end', function() {
		disconnect();
	});
	
	c.pipe(airtunes, {end: false});
	
	c.on('data', function() {
		at.connect();
		lastAudioPacketTimestamp = Date.now();
	});
});
server.listen(1234, function() {
	console.log("Server bound");
});


