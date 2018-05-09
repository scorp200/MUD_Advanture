// cache DOM
var domTools = document.getElementById("tools"),
	domCharacter = document.getElementById("character");

/**
 * @namespace
 */
Client = {

	characterName: "",
	characterPass: "",
	color: "#FFFFFF",
	playerID: null,
	chunk: null,
	position: {
		x: 80,
		y: 40
	},
	inventory: {},
	socket: null,

	/**
	 * Refreshes the player's stats in the DOM.
	 */
	refreshStats: function() {
		var elHP = document.querySelector("#character .health");
		var elHUN = document.querySelector("#character .hunger");
		var elHYD = document.querySelector("#character .hydration");
		elHP.textContent = "HP: " + (Client.hp || 0);
		elHUN.textContent = "HUN: " + (Client.hunger || 0);
		elHYD.textContent = "HYD: " + (Client.hydration || 0);
	}

}

//
var world; // = new World();
var renderer = new Renderer();
renderer.createField();
renderer.renderImage();

//world.generate();
//renderer.update(world, {x:64, y:64});
//world.saveAsPNG();

//server connection
Story.log("<1-Connecting...->");
var socket = null;
var con = new WebSocket(ServerConfig.path);
con.onopen = function() {
	Story.log("<1-You have entered a new world!->");
	Story.log("<1-waiting to open eyes....->");
	socket = con;
	Client.socket = socket;
}

con.onerror = function(err) {
	console.log('Socket error: ' + err);
	Story.log('<r-Whoops there was a problem entering the world...->');
}

con.onclose = function(err) {
	console.log('socket closed');
	Story.log('<r-The world has been lost...-> <w-refresh?->');
	socket = null;
}

con.onmessage = function(msg) {
	var data = JSON.parse(msg.data);

	// error
	if (data.error) {
		Story.log("<r-" + data.error + "->");
	}

	// get the client id from the server
	if (data.cid !== undefined) {
		Story.intro();
		Client.clientID = data.cid.toString();
		console.log("Client ID set to " + Client.clientID);
		autoLogin();
	}

	// get the client's player data
	if (data.player !== undefined) {
		Object.assign(Client, data.player);
		Client.refreshStats();
	}

	// get the world from the server
	if (data.world !== undefined) {
		console.log(data.world);
		world = new World(data.world);
		Crafting.world = world;
		console.log("data.world");
		Story.log("<1-you now see the vast world->");
	}

	// received update from server
	if (data.update) {
		data.update.forEach(function(update) {

			//console.log(update);
			if (update.error) {
				Story.log("<a-Server:-> " + update.error);
			}
			
			//
			else if (update.notify) {
				Story.notify(update.notify);
			}
			
			//
			else if (update.warn) {
				Story.warn(update.warn);
			}

			// update inventory
			else if (update.inventory) {
				Client.inventory = update.inventory;
			}

			// cell change
			else if (update.cell) {
				console.log("update.change");
				console.log(update.cell);

				// cell change code goes here it should be 11/10 and no less
				var chunk = world.getChunk(update.cell);
				var cellX = update.cell.x - chunk.realX;
				var cellY = update.cell.y - chunk.realY;
				chunk.setCell(cellX, cellY, update.cell.tile);
				console.log("cell changed!", cellX, cellY, update.cell.tile);
			}

			//delete player
			else if (update.delete) {
				delete world.chunks[update.index].players[update.delete];
			}

			// player moved
			else if (update.move) {
				world.chunks[update.index].players[update.move] = update.position;
				if (update.move.toString() == Client.playerID) {
					Client.position.x = update.position.x;
					Client.position.y = update.position.y;
				}
			}

			// player say
			else if (update.say) {
				console.log("update.say");
				Story.log("<a-" + update.name + "->: " + update.say);
			}

			//get new chunks
			else if (update.chunk) {

				//
				var x = update.chunk.props.x,
					y = update.chunk.props.y,
					i = y * world.width + x;

				//
				Object.assign(world.chunks[i], update.chunk.props);
				Object.assign(world.chunks[i].players, update.chunk.players);
				world.chunks[i].stringToBuffer(update.chunk.data);

			}
		});

		//
		renderer.update(world, Client.position);
	}

	// primarily for debugging
	if (data == 'ping!') {
		console.log('ping: ' + Date.now());
	}

	return true;

}

var sendToServer = function(data) {
	try {
		socket.send(JSON.stringify(data));
	} catch (e) {
		console.log('error sending data: ' + e);
	}
}

/**
 *
 */
function autoLogin() {
	var name = '';
	var seed = Array.from(Date.now().toString());
	while (name.length < 5) {
		var char = 97 + parseInt(seed[seed.length - name.length]);
		console.log(char);
		name += String.fromCharCode(char);
	}
	Command.execute("new");
	Command.execute(name);
	Command.execute("pass");
}
