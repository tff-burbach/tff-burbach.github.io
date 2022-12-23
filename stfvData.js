/**
 * STFV data access
 */
//  const fetch = require('node-fetch');
 // const axios = require('axios').default;
 // const { JSDOM } = require( "jsdom" );

stfvData = {

	async getMatchDays(team, year, category) {
		const stfvTableHTML = await stfvData.fetchTableFromStfv(team, 1, year, category);
		return stfvData.extractMatchDays(stfvTableHTML);
	},

	async getLeagueData(team, matchdayno, year, category) {
		const stfvTableHTML = await stfvData.fetchTableFromStfv(team, matchdayno, year, category);
		return stfvData.extractLeagueData(team, stfvTableHTML);
	},

	async collectLeagueData(team, year, category) {
		// const matchDays = await stfvData.getMatchDays(team, year, category);
		return stfvData.getLeagueData(team, 1, year, category);
	},

	getLeagueUrl(leaguename, matchdayno, year, category) {
		year = year ? year : 2019;
		category = category ? encodeURIComponent(category) : 'Ligabetrieb+Classic';
		leaguename = leaguename.replace(' ', '+').replace('ü','%FC');  // encodeURIComponent does not work
		// return `http://www.stfv.de/stfv/ligabetrieb/ligatabelle.php?Liga=${leaguename}&Spieltag_Nr=${matchdayno}&Jahr=${year}&Kategorie=${category}&Ansicht=Kreuztabelle`;
		// const stfvURL = `https://www.stfv.de/stfv/ligabetrieb/ligatabelle.php?Jahr=${year}&Kategorie=${category}&Liga=${leaguename}&Spieltag_Nr=${matchdayno}&Ansicht=Kreuztabelle`;
		// const stfvURLEncoded = encodeURIComponent(stfvURL);
		const stfvURLEncoded = `https%3A//www.stfv.de/stfv/ligabetrieb/ligatabelle.php%3FJahr%3D${year}%26Kategorie%3D${category}%26Liga%3D${leaguename}%26Spieltag_Nr%3D${matchdayno}%26Ansicht%3DKreuztabelle`;
		return `https://api.allorigins.win/get?url=${stfvURLEncoded}`;
	},

	async fetchTableFromStfv(team, matchdayno, year, category) {
		const url = stfvData.getLeagueUrl(team.league, matchdayno, year, category);
		const response = await axios({
			method: 'GET',
			url: url
		})
		// fetch(url);
		var html = response.data.contents;
		var stfvTable = document.createElement('div');
		stfvTable.innerHTML = stfvData.fixEncoding(html);
		return stfvTable;
		// html = stfvData.fixEncoding(html);
		// return html;
	},

	extractMatchDays: function (stfvTableHtml) {
		// const { window } = new JSDOM(stfvTableHtml);
		// var $ = require( "jquery" )( window );
		// var stfvTable = window;
		var matchDayOptions = $('select[name="Spieltag_Nr"]', stfvTableHtml)[0].options;
		var allMatchdays = [];
		var currentDate = stfvData.getCurrentDate();
		var currentIndex = 0;
		for (i = 0; i < matchDayOptions.length; i++) {
			var option = matchDayOptions[i];
			var textDate = option.text.split(", ")[1];
			var d = textDate.split(".");
			var tmpDate = new Date('20' + d[2], d[1] - 1, d[0]);
			if (1 > 0 && currentDate > tmpDate) {
				currentIndex = i - 1;
			}
			tmpDate.setHours(21);
			var matchDay = { no: parseInt(option.value), text: option.text, date: tmpDate, games: [] };
			allMatchdays[i] = matchDay;
		};
		currentMatchDay = Object.assign({}, allMatchdays[currentIndex]);
		allMatchdays[currentIndex].current = true;
		allMatchdays.sort((a, b) => (a.no > b.no) ? 1 : (b.no > a.no) ? -1 : 0);
		return { allMatchdays: allMatchdays, currentMatchDay: currentMatchDay };
	},

	extractLeagueData: function (team, stfvTableHtml) {
		// const { window } = new JSDOM(stfvTableHtml);
		// var $ = require( "jquery" )( window );
		// var stfvTable = window;
		var matchDays = stfvData.extractMatchDays(stfvTableHtml);
		var currentMatchDay = matchDays.currentMatchDay;
		var allMatchdays = matchDays.allMatchdays;
		var matches = [];

		var tables = $('.ligatabelle', stfvTableHtml);
		// var tables = $('.ligatabelle');
		var games = tables[0].childNodes[1].childNodes;
		var table = tables[1].childNodes[2].childNodes;

		// Games
		var gamesTable = [];
		for (var i = 1; i < games.length; i++) {
			var row = games[i];
			if (row.nodeName === 'TR') {
				if (row.childNodes.length <= 1) {
					continue;
				}
				var gamesRow = {};
				gamesRow.no = row.childNodes[1].textContent;
				gamesRow.team1 = row.childNodes[3].textContent;
				gamesRow.team2 = row.childNodes[5].textContent;
				gamesRow.result = row.childNodes[7].textContent;
				gamesTable.push(gamesRow);
			}
		}
		currentMatchDay.games = gamesTable;

		// League Table
		var leagueTable;
		leagueTable = [];
		for (var i = 0; i < table.length; i++) {
			var row = table[i];
			if (row.nodeName === 'TR') {
				var leagueRow = {};
				leagueRow.place = row.childNodes[1].textContent;
				leagueRow.team = row.childNodes[3].textContent;
				// 5 - 27: Spiele gegen 1. - 12.
				leagueRow.goals = row.childNodes[29].textContent;
				leagueRow.sets = row.childNodes[31].textContent;
				leagueRow.scores = row.childNodes[33].textContent;
				leagueTable.push(leagueRow);
				stfvData.extractGames(team, row, allMatchdays, matches);
			}
		}
		currentMatchDay.table = leagueTable;

		// Sort Matches
		matches.sort((a,b) => (a.matchDay > b.matchDay) ? 1 : ((b.matchDay > a.matchDay) ? -1 : 0))

		// Next Games
		if (currentMatchDay.no < (allMatchdays.length + 1)) {
			currentMatchDay.nextGames = allMatchdays[currentMatchDay.no];
		}

		return { currentMatchDay: currentMatchDay, matchDays: allMatchdays, matches: matches };

	},

	extractGames(team, row, allMatchdays, matches) {
		for (var i = 5; i <= 27; i = i + 2) {
			if (row.childNodes[i].outerHTML.indexOf("Tip") > '') {
				var game = stfvData.extractGame(team, row.childNodes[i].attributes.onmouseover.textContent, row.childNodes[i].textContent, matches);
				allMatchdays[game.matchDay - 1].games.push(game);
				delete game.matchDay;
			}
		}
	},

	extractGame(team, tooltip, result, matches) {
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
		game.date = new Date(dateSplit[2], dateSplit[1] - 1, dateSplit[0], timeSplit[0], timeSplit[1]);
		var teamSplit = matchSplit[1].split(" - ");
		game.team1 = teamSplit[0];
		game.team2 = teamSplit[1];
		game.result = result;
		// own match
		if (game.team1 === team.name || game.team2 === team.name) {
			var match = {
				matchDay: game.matchDay,
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

	async getLocations() {
		return [];
		var cookie = await stfvData.getLoginCookie();
		var url = 'https://api.allorigins.win/get?url=http://www.stfv.de/stfv/vereine/info_vereine.php'
		const response = await axios({
			method: 'GET',
			headers: { Cookie: cookie },
			url: url
		})
		// fetch(url, { headers: { Cookie: cookie }});
		var html = response.data;
		// var html = await response.text({ convert: true });
		html = stfvData.fixEncoding(html);
		const { window } = new JSDOM(html);
		var $ = require( "jquery" )( window );
		// var stfvTable = window;

		var locations = [];
		// var html = result.data;
		var htmlInfoRows = $('.adressen tr:not(.tabellenkopf2)');
		htmlInfoRows.each(function(index) {
			var $trTag = $(this);
			var location = {};
			location.team = $trTag.children().eq(0).text().trim();
			location.pub = $trTag.children().eq(1).text();
			var $adressTD = $trTag.children().eq(2);
			$addressLink = $adressTD.children().eq(0);
			$addressLink.html($addressLink.html().replace(/<br>/g,", "));
			$addressLink.text(location.pub + ", " + $addressLink.text());
			location.text = $addressLink.text();
			location.link = $addressLink.attr('href');
			locations.push(location);
		})
		return locations;
	},

	async getLoginCookie() {
		var response = await axios({
			method: 'POST',
			url: 'http://www.stfv.de/stfv/login.php',
			data: 'Benutzername=user&Passwort=pwd&login=Anmelden',
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded',
			}
		})
		return response.headers["set-cookie"][0];
	},

	fixEncoding: function(html) {
		html = html.replace(/H�lz/g,'Hülz');
		html = html.replace(/K�ller/g,'Kölle');
		html = html.replace(/H�hner/g,'Hühner');
		html = html.replace(/H�ttig/g,'Hüttig');
		html = html.replace(/r�ck/g,'rück');
		html = html.replace(/st�tte/g,'stätte');
		html = html.replace(/f�r/g,'für');
		html = html.replace(/h�tte/g,'hütte');
		html = html.replace(/B�umche/g,'Bäumche');
		html = html.replace(/tra�e/g,'traße');
		html = html.replace(/chlo�/g,'chloß');
		html = html.replace(/r�s/g,'r\'s');
		html = html.replace(/L�mmer/g,'Lämmer');
		html = html.replace(/V�lk/g,'Völk');
		html = html.replace(/K�schd/g,'Käschd');
		html = html.replace(/SAMS�s/g,'SAMS\'s');
		html = html.replace(/r�hling/g,'rühling');
		html = html.replace(/H�cher/g,'Höcher');
		html = html.replace(/h�he/g,'höhe');
		html = html.replace(/g�rten/g,'gärten');
		html = html.replace(/F�ssje/g,'Fässje');
		html = html.replace(/Sch�fer/g,'Schäfer');
		
		return html;
	},

	getCurrentDate() {
		// return new Date();
		return new Date(2019,12,01);
	},

};