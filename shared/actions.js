(function() {
	var server = typeof module !== "undefined";

	var actions = {
		game: null,
		items: null,
		user: {
			'cut': { _execute: exeTileAction.bind(null) },
			'mine': { _execute: exeTileAction.bind(null) },
			'eat': { _execute: exeTileAction.bind(null) },
			'drink': { _execute: exeTileAction.bind(null) },
			'bath': { _execute: exeTileAction.bind(null) }
		}
	}

	//server only command
	if (server)
		actions.user['item'] = { _execute: exeItemAction.bind(null) };

	actions.user.cut._execute.desc = "Cut something, like a tree or a movie scene.";
	actions.user.mine._execute.desc = "Mine something, like some ore.";
	actions.user.drink._execute.desc = "Drink some wild water.";
	actions.user.bath._execute.desc = "take a bath.";

	actions.init = function(commands) {
		actions.commands = commands;
		Object.assign(commands.user, actions.user);
	}

	function exeTileAction(dir, opts = {}, toAction) {
		if (server) {
			var player = opts.player;
			var world = opts.world;
			var aPos = Object.assign({}, player.position);

			actions.utils.applyDir(aPos, dir);

			var chunk = world.getChunk(aPos);
			aPos.x -= chunk.realX;
			aPos.y -= chunk.realY;
			var cell = chunk.getCell(aPos);
			if (cell.actions && cell.actions[toAction]) {
				var action = cell.actions[toAction];
				action.drop ? drop(action.drop, player) : null;
				action.change ? change({
					tile: action.change,
					chunk: chunk,
					pos: aPos,
					player: player
				}) : null;
				action.required ? required(action.required, player) : null;
				action.playerStats ? stats(action.playerStats, player) : null;
				action.notify ? notify(action.notify, player) : null;
			} else
				actions.game.pushUpdate({
					warn: 'There is nothing here to ' + toAction + '...'
				}, { player: player });
		} else {
			if (Utils.checkDir(dir))
				sendToServer({ command: toAction + ' ' + dir });
			else if (dir.split(' ').length > 0) {
				exeItemAction(toAction + ' ' + dir, opts, 'item');
			} else {
				Story.warn('Please use n, e, s or w for direction!');
			}
		}
	}

	function exeItemAction(params, opts = {}, toAction) {
		var items = server ? actions.items : Items;
		var split = params.split(' ');
		var item = items.mapping[split[1]];
		var secondAction = split[0];
		var player = (server) ? opts.player : Client;
		if (item !== undefined && player.inventory[item.id] !== undefined) {
			if (item.actions === undefined || item.actions[secondAction] === undefined) {
				if (!server)
					Story.warn('You can\'t do that');
				else
					console.log(player.name + ' attempted an invalid action.');
				return;
			}

			if (server)
				var action = item.actions[secondAction];

		} else {

			if (!server)
				Story.warn('You don\'t have such item');
			else
				console.log(player.name + ' doesn\'t have such item.');
			return;

		}

		if (server) {
			if (!(action.required ? required(action.required, player) : true)) {
				actions.game.pushUpdate({
					warn: 'you dont have enough required items'
				}, { player: player });
				return;
			}
			action.drop ? drop(action.drop, player) : null;
			action.playerStats ? stats(action.playerStats, player) : null;
			action.notify ? notify(action.notify, player) : null;

		} else {

			sendToServer({ command: toAction + ' ' + params });

		}

	}

	/**
	 * Drops an item, giving it to the player.
	 */
	function drop(drop, player) {
		actions.game.dropItem(player, drop);
	}

	/**
	 * Changes a cell.
	 */
	function change(opts) {
		opts.chunk.setCell(opts.pos.x, opts.pos.y, opts.tile, true);
	}

	/**
	 * Change player stats
	 */
	function stats(stats, player) {
		for (var i = 0, keys = Object.keys(stats); i < keys.length; i++) {
			var key = keys[i];
			if (player[key] === undefined)
				continue;
			player[key] = actions.utils.clamp(0, 100, player[key] += stats[key]);
		}
	}

	/**
	 * Notifies the player
	 */
	function notify(msg, player) {
		actions.game.pushUpdate({ notify: msg }, { player: player });
	}

	/**
	 *
	 */
	function required(req, player) {
		for (var i = 0, keys = Object.keys(req); i < keys.length; i++) {
			var key = keys[i];
			var iid = actions.items.getID(key);
			if (player.inventory[iid] < req[key])
				return false;
			player.inventory[iid]--;
		}
		return true;
	}

	//
	if (!server) {
		actions.init(Command);
	}

	// Export
	if (!server) {
		window["Action"] = actions;
	} else {
		module.exports = actions;
	}

})();
