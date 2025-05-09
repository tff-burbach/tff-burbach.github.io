/**
 * STFV data access
 */

const USE_PROXY = true;

stfvData = {


	async getLeagueData(team, matchdayno, category, groupNo) {
		const stfvTableHTML = await stfvData.fetchTableFromStfv(team, matchdayno, category, groupNo);
		return stfvData.extractLeagueData(team, stfvTableHTML);
	},

	async collectLeagueData(team, category) {
		// const matchDays = await stfvData.getMatchDays(team, year, category);
		return stfvData.getLeagueData(team, 1, category);
	},

	async collectPlayoffLeagueData(team, category) {
		// const matchDays = await stfvData.getMatchDays(team, year, category);
		return stfvData.getLeagueData(team, 1, category, 'Abstiegsrunde');
	},

	getLeagueUrl(leaguename, matchdayno, year, category, groupNo) {
		year = year ? year : 2023;
		category = category ? encodeURIComponent(category) : 'Ligabetrieb+Classic';
		leaguename = leaguename.replace(' ', '+').replace('ü','%FC');
		groupNo = groupNo ? groupNo : 'Ligaphase';
		const stfvURL = `https://alt.stfv.de/stfv/ligabetrieb/ligatabelle.php?Jahr=${year}&Kategorie=${category}&Liga=${leaguename}&Gruppe_Nr=${groupNo}&Ansicht=Kreuztabelle`;
		const stfvURLEncoded = encodeURI(stfvURL);
		// const stfvURLEncoded = `https%3A//www.stfv.de/stfv/ligabetrieb/ligatabelle.php%3FJahr%3D${year}%26Kategorie%3D${category}%26Liga%3D${leaguename}%26Spieltag_Nr%3D${matchdayno}%26Ansicht%3DKreuztabelle`;
		// return `https://api.allorigins.win/get?url=${stfvURLEncoded}`;
		return USE_PROXY ? `https://corsproxy.io/?${stfvURLEncoded}` : stfvURL;
	},

	getBackupLeagueUrl(leaguename, matchdayno, year, category, groupNo) {
		if (!groupNo || groupNo === 'Ligaphase') {
			return '/stfv/kreuztabelle.html';
		}
		else {
			return `/stfv/${groupNo}_kreuztabelle.html`;
		}
	},

	async fetchTableFromStfv(team, matchdayno, category, groupNo) {
		var response;
		try {
			const url = stfvData.getLeagueUrl(team.league, matchdayno, team.year, category, groupNo);
			response = await $.get({url: url, cache: false});
		}
		catch (ex) {
			const url = stfvData.getBackupLeagueUrl(team.league, matchdayno, team.year, category, groupNo);
			response = await $.get({url: url, cache: false});
		}
		var html = response;	//.contents;
		var stfvTable = document.createElement('div');
		stfvTable.innerHTML = html; //stfvData.fixEncoding(html);
		return stfvTable;
	},

	extractMatchDays: function (stfvTableHtml) {
		var matchDayOptions = $('select[name="Spieltag_Nr"]', stfvTableHtml)[0].options;
		var allMatchdays = [];
		var currentDate = stfvData.getCurrentDate();
		var currentIndex = 0;
		var counter = 0;
		for (i = 0; i < matchDayOptions.length; i++) {
			var option = matchDayOptions[i];
			if (option.text.indexOf(',') > 0) {
				var textDate = option.text.split(", ")[1];
				var d = textDate.split(".");
				var tmpDate = new Date('20' + d[2], d[1] - 1, d[0]);
				if (currentDate > tmpDate) {
					currentIndex = counter;
				}
				tmpDate.setHours(21);
				var matchDay = { no: parseInt(option.value), text: option.text, date: tmpDate, games: [] };
				allMatchdays[i] = matchDay;
				counter++;
			}
		};
		allMatchdays.sort((a, b) => (a.no > b.no) ? 1 : (b.no > a.no) ? -1 : 0);
		currentMatchDay = Object.assign({}, allMatchdays[currentIndex]);
		currentMatchDay.index = currentIndex;
		allMatchdays[currentIndex].current = true;
		return { allMatchdays: allMatchdays, currentMatchDay: currentMatchDay };
	},

	extractLeagueData: function (team, stfvTableHtml) {
		var matchDays = stfvData.extractMatchDays(stfvTableHtml);
		var currentMatchDay = matchDays.currentMatchDay;
		var allMatchdays = matchDays.allMatchdays;
		var matches = [];

		var tableRows = $('.ligatabelle > tbody > tr', stfvTableHtml);

		var tables = $('.ligatabelle', stfvTableHtml);
		// var games = tables[0].childNodes[1].childNodes;
		var table = tables[0].childNodes[1].childNodes;

		// // Games
		// var gamesTable = [];
		// for (var i = 1; i < games.length; i++) {
		// 	var row = games[i];
		// 	if (row.nodeName === 'TR') {
		// 		if (row.childNodes.length <= 1) {
		// 			continue;
		// 		}
		// 		var gamesRow = {};
		// 		gamesRow.no = row.childNodes[1].textContent;
		// 		gamesRow.team1 = row.childNodes[3].textContent;
		// 		gamesRow.team2 = row.childNodes[5].textContent;
		// 		gamesRow.result = row.childNodes[7].textContent;
		// 		gamesTable.push(gamesRow);
		// 	}
		// }
		// currentMatchDay.games = gamesTable;

		// League Table
		var leagueTable;
		leagueTable = [];

		var lostGames = [];
		for (var i = 0; i < tableRows.length; i++) {
			var row = tableRows[i];
				var leagueRow = {};
				leagueRow.place = row.childNodes[1].textContent;
				leagueRow.team = row.childNodes[3].textContent;
				// 5 - 27: Spiele gegen 1. - 12.
				leagueRow.goals = row.childNodes[row.childNodes.length-6].textContent.replaceAll(' ','');
				leagueRow.sets = row.childNodes[row.childNodes.length-4].textContent.replaceAll(' ','');
				leagueRow.scores = row.childNodes[row.childNodes.length-2].textContent.replaceAll(' ','');
				leagueTable.push(leagueRow);
				lostGames.push(...stfvData.extractGames(team, row, allMatchdays, matches));
		}

		// If game has been moved to another date and no matchday number information is available
		for (var i = 0; i < lostGames.length; i++) {
			const expectedGamesCount = ((allMatchdays.length / 2 + 1) / 2);
			var lostGame = lostGames[i];
			var incompleteMatchday = allMatchdays.find(entry => {
				if (entry.games.length < expectedGamesCount) {
					return !entry.games.find(game => {
						game.team1 != lostGame.team1 &&
						game.team2 != lostGame.team1 &&
						game.team1 != lostGame.team2 &&
						game.team2 != lostGame.team2;
					})
				}
				return false;
			})
			if (incompleteMatchday) {
				incompleteMatchday.games.push(lostGame);
			}
		}


		// for (var i = 0; i < table.length; i++) {
		// 	var row = table[i];
		// 	if (row.nodeName === 'TR') {
		// 		var leagueRow = {};
		// 		leagueRow.place = row.childNodes[1].textContent;
		// 		leagueRow.team = row.childNodes[3].textContent;
		// 		// 5 - 27: Spiele gegen 1. - 12.
		// 		leagueRow.goals = row.childNodes[row.childNodes.length-6].textContent.replaceAll(' ','');
		// 		leagueRow.sets = row.childNodes[row.childNodes.length-4].textContent.replaceAll(' ','');
		// 		leagueRow.scores = row.childNodes[row.childNodes.length-2].textContent.replaceAll(' ','');
		// 		leagueTable.push(leagueRow);
		// 		stfvData.extractGames(team, row, allMatchdays, matches);
		// 	}
		// }
		currentMatchDay.table = leagueTable;

		// Sort Matches
		matches.sort((a,b) => (a.matchDay > b.matchDay) ? 1 : ((b.matchDay > a.matchDay) ? -1 : 0))

		// Next Games
		// if (currentMatchDay.no < (allMatchdays.length + 1)) {
		// 	currentMatchDay.nextGames = allMatchdays[currentMatchDay.no];
		// }

		return { currentMatchDay: currentMatchDay, matchDays: allMatchdays, matches: matches };

	},

	extractGames(team, row, allMatchdays, matches) {
		var lostGames = [];
		for (var i = 0; i < row.childNodes.length; i++) {
			if (row.childNodes[i].outerHTML && row.childNodes[i].outerHTML.indexOf("Tip") > '') {
				var game = stfvData.extractGame(team, row.childNodes[i].attributes.onmouseover.textContent, row.childNodes[i].textContent, matches, allMatchdays);
				var matchday;
				matchday = allMatchdays.find(entry => {
					return entry.no === game.matchDay;
				})
				if (matchday) {
					matchday.games.push(game);
				}
				else {
					lostGames.push(game);
				}
				delete game.matchDay;
			}
		}
		return lostGames;
	},

	extractGame(team, tooltip, result, matches, allMatchdays) {
		var game = {};
		// Tip('21. Spieltag, 15.11.2019 21:00:00:<br>TFF Burbach 1 - TFC Hülzweiler/Saarwellingen 1', TEXTALIGN, 'center', BGCOLOR, '#FFF000')
		var tipInfo = tooltip.split("'")[1];
		var matchDaySplit = tipInfo.split(", ");
		game.matchDay = parseInt(matchDaySplit[0].split(".")[0]);
		var matchSplit = matchDaySplit[1].split(":<br>");
		game.time = matchSplit[0];
		var dateTimeSplit = game.time.split(" ");
		var dateSplit = dateTimeSplit[0].split(".");
		var timeSplit = dateTimeSplit[1].split(":");
		// game.datetime = new Date(dateSplit[2], dateSplit[1] - 1, dateSplit[0], timeSplit[0], timeSplit[1]);
		game.datetime = `${dateSplit[2]}-${dateSplit[1]}-${dateSplit[0]}T${timeSplit[0]}:${timeSplit[1]}:${timeSplit[2]}`;
		// Matchday sometimes not part of tooltip e.g. outside Ligaphase
		if (!game.matchDay) {
			var matchday = allMatchdays.find(entry => {
				return entry.date.toJSON().split('T')[0] == game.datetime.split('T')[0];
			})
			game.matchDay = matchday ? matchday.no : '?';
		}
		game.date = `${dateSplit[2]}-${dateSplit[1]}-${dateSplit[0]}`;
		game.time = `${timeSplit[0]}:${timeSplit[1]}`
		var teamSplit = matchSplit[1].split(" - ");
		game.team1 = teamSplit[0];
		game.team2 = teamSplit[1];
		game.result = result;
		// own match
		if (game.team1 === team.name || game.team2 === team.name) {
			var match = {
				matchDay: game.matchDay,
				datetime: game.datetime,
				date: game.date,
				time: game.time,
				result: game.result
			};
			if (game.team1 === team.name) {
				match.home = true;
				match.opponent = game.team2;
			}
			else {
				match.home = false;
				match.opponent = game.team1;
			}
			matches.push(match);
		}
		return game;
	},

	getCurrentDate() {
		return tffTools.getCurrentDate();
	},

};