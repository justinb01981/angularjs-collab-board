var app = angular.module('app', []);

app.directive('stickyNote', function(socket) {
	var linker = function(scope, element, attrs) {
			element.draggable({
				stop: function(event, ui) {
					var textarea = this.children[2];
					socket.emit('moveNote', {
						id: scope.note.id,
						x: ui.position.left,
						y: ui.position.top
					});
				}
			});

			socket.on('onNoteMoved', function(data) {
				// Update if the same note
				if(data.id == scope.note.id) {
					element.animate({
						left: data.x,
						top: data.y
					});
				}
			});

			// Some DOM initiation to make it nice
			element.css('left', '10px');
			element.css('top', '50px');
			element.hide().fadeIn();
		};

	var controller = function($scope) {
			// Incoming
			socket.on('onNoteUpdated', function(data) {
				// Update if the same note
				if(data.id == $scope.note.id) {
					$scope.note.title = data.title;
					$scope.note.body = data.body;
					$scope.note.width = data.width;
					$scope.note.height = data.height;
					$scope.note.color = data.color;
				}				
			});

			// Outgoing
			$scope.updateNote = function(note) {
				socket.emit('updateNote', note);
			};

			$scope.growNote = function(note) {
				if($scope.note.width < 4096 && $scope.note.height < 4096) {
					$scope.note.width = $scope.note.width += 50;
					$scope.note.height = $scope.note.height += 50;
					socket.emit('updateNote', note);
				}
			};

			$scope.shrinkNote = function(note) {
				if($scope.note.width > 100 && $scope.note.height > 100) {
					$scope.note.width = $scope.note.width -= 50;
					$scope.note.height = $scope.note.height -= 50;
					socket.emit('updateNote', note);
				}
			};

			$scope.colorNote = function(note) {
				var colorsList = ['red', 'blue', 'green', 'yellow', 'white'];
				var idx = colorsList.indexOf($scope.note.color);
				if(idx < 0 || idx == 4) idx = 0;
				else idx += 1;
				$scope.note.color = colorsList[idx];
				socket.emit('updateNote', note);
			};

			$scope.deleteNote = function(id) {
				$scope.ondelete({
					id: id
				});
			};
		};

	return {
		restrict: 'A',
		link: linker,
		controller: controller,
		scope: {
			note: '=',
			ondelete: '&'
		}
	};
});

app.factory('socket', function($rootScope) {
	var socket = io.connect();
	return {
		on: function(eventName, callback) {
			socket.on(eventName, function() {
				var args = arguments;
				$rootScope.$apply(function() {
					callback.apply(socket, args);
				});
			});
		},
		emit: function(eventName, data, callback) {
			socket.emit(eventName, data, function() {
				var args = arguments;
				$rootScope.$apply(function() {
					if(callback) {
						callback.apply(socket, args);
					}
				});
			});
		}
	};
});

app.controller('MainCtrl', function($scope, socket) {
	$scope.notes = [];

	// Incoming
	socket.on('onNoteCreated', function(data) {
		$scope.notes.push(data);
	});

	socket.on('onNoteDeleted', function(data) {
		$scope.handleDeletedNoted(data.id);
	});

	// Outgoing
	$scope.createNote = function() {
		var note = {
			id: new Date().getTime(),
			title: 'New Note',
			body: 'Pending',
			width: 300,
			height: 200,
			color: 'yellow'
		};

		$scope.notes.push(note);
		socket.emit('createNote', note);
	};

	$scope.deleteNote = function(id) {
		$scope.handleDeletedNoted(id);

		socket.emit('deleteNote', {id: id});
	};

	$scope.handleDeletedNoted = function(id) {
		var oldNotes = $scope.notes,
		newNotes = [];

		angular.forEach(oldNotes, function(note) {
			if(note.id !== id) newNotes.push(note);
		});

		$scope.notes = newNotes;
	}
});
