var express = require('express'),
	app = express(),
	server = require('http').createServer(app),
	io = require('socket.io').listen(server);

app.configure(function() {
    app.use(express.static(__dirname + '/public'));
});

var fs = require('fs');

var noteList = [];

var noteFormat = ['id', 'x', 'y', 'title', 'body', 'width', 'height', 'color'];
var noteFieldSeparator = '----NOTE_SEPARATOR----';
var notePort = 1337;
var noteDB = "notes_"+notePort+".txt";


function noteListWrite() {
	var noteString = new Buffer("");

	for(var i = 0; i < noteList.length; i++) {
		for(var k in noteFormat) {
			noteString += Buffer(noteList[i][noteFormat[k]] + noteFieldSeparator);
		}
	}

	fs.writeFile(noteDB, noteString, function(err){});
}

function noteListReadFunc(err, data) {
	var noteString = '' + data;

	var list = noteString.split(noteFieldSeparator);
	var f = 0;
	var n = {};
	for(var l in list) {
		n[noteFormat[f]] = list[l];
		f = f+1;
		if(f >= noteFormat.length) {
			f = 0;
			noteList[noteList.length] = n;
			n = {};
		}
	}
}

function noteListRead() {
	var noteString;

	fs.readFile(noteDB, noteListReadFunc);
}

function noteUpdate(data, del) {
	console.log("noteUpdate data:");
	console.log(data);

	var i;
	for (i = 0; i < noteList.length; i++) {
		if (noteList[i].id == data.id) {
			if(del) {
				noteList.splice(i, 1);
				noteListWrite();
				return;
			}
			break;
		}
	}

        var n = {};
	if(i < noteList.length) n = noteList[i];

	for(var k in noteFormat) {
		var j = noteFormat[k];
		if(data[j] != null) n[j] = data[j];
	}
	noteList[i] = n;

	/* save to file */
	noteListWrite();
}

io.sockets.on('connection', function(socket) {
	
	var i;
	for (i = 0; i < noteList.length; i++) {
		socket.emit('onNoteCreated', noteList[i]);
		socket.emit('onNoteMoved', noteList[i]);
	}

	socket.on('createNote', function(data) {
		socket.broadcast.emit('onNoteCreated', data);
		noteUpdate(data, 0);
	});

	socket.on('updateNote', function(data) {
		socket.broadcast.emit('onNoteUpdated', data);
		noteUpdate(data, 0);
	});

	socket.on('moveNote', function(data){
		socket.broadcast.emit('onNoteMoved', data);
		noteUpdate(data, 0);
	});

	socket.on('saveNote', function(data){
		socket.broadcast.emit('onNoteSaved', data);
		noteUpdate(data, 0);
	});

	socket.on('deleteNote', function(data){
		socket.broadcast.emit('onNoteDeleted', data);
		noteUpdate(data, 1);
	});
});

server.listen(notePort);

noteListRead();
console.log("Started...");
