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
		return stfvData.getLeagueData(team, 1, category);
	},

	async collectPlayoffLeagueData(team, category) {
		return stfvData.getLeagueData(team, 1, category, 'Abstiegsrunde');
	},

	getLeagueUrl(leaguename, matchdayno, year, category, groupNo) {
		year = year ? year : 2026;
		category = category ? encodeURIComponent(category) : 'Ligabetrieb+Classic';
		leaguename = leaguename.replace(' ', '+').replace('ü','%FC');
		groupNo = groupNo ? groupNo : 'Ligaphase';
		const stfvURL = `https://stfv.de/teamsport/classic-ligen/classic-landesliga?`;
		const stfvURLEncoded = encodeURI(stfvURL);
		return USE_PROXY ? `https://corsproxy.io/?${stfvURLEncoded}` : stfvURL;
	},

	getBackupLeagueUrl(leaguename, matchdayno, year, category, groupNo) {
		return '/stfv/landesliga-classic.html';
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
		var html = response;
		var stfvTable = document.createElement('div');
		stfvTable.innerHTML = html;
		return stfvTable;
	},

	extractLeagueData: function (team, stfvTableHtml) {
		// League Table
		let leagueTable = [];
		$("table.dtfl-table-medium tr.sectiontableentry1, table.dtfl-table-medium tr.sectiontableentry2", stfvTableHtml).each(function() {
			let team = {
				place: $(this).find('td').eq(0).text().trim(),
				team: $(this).find('td').eq(1).text().trim(),
				games: $(this).find('td').eq(2).text().trim(),
				wins: $(this).find('td').eq(3).text().trim(),
				draws: $(this).find('td').eq(4).text().trim(),
				losses: $(this).find('td').eq(5).text().trim(),
				goals: $(this).find('td').eq(6).text().trim(),
				goals_diff: $(this).find('td').eq(7).text().trim(),
				sets: $(this).find('td').eq(8).text().trim(),
				sets_diff: $(this).find('td').eq(9).text().trim(),
				scores: $(this).find('td').eq(10).text().trim()
			};
			leagueTable.push(team);
		});

		// Games
		let matches = [];
		let matchDay;
		let allMatchdays = [];

		$("table.contentpaneopen:not(.dtfl-table-medium) tr", stfvTableHtml).each(function() {
			if ($(this).hasClass('sectiontableheader')) {
				// Extract the match day
				if ($(this).find('th').text().indexOf('Spieltag') > 0) {
					matchDayText = $(this).find('th').text().trim();
					matchDay = { no: parseInt(matchDayText.match(/\d+/)[0]), text: matchDayText, date: null, games: [] };
					allMatchdays.push(matchDay);
				}
			} else if ($(this).hasClass('sectiontableentry1') || $(this).hasClass('sectiontableentry2')) {
				// Extract match information
				let dateTimeStr = $(this).find('td').eq(0).text().trim();
				let [date, time] = dateTimeStr.split(' ').slice(1); // Remove the day name (e.g. "Fr.,")
				let dateSplit = date.split(".");
				let timeSplit = time.split(":");

				let game = {
					matchDay: matchDay.no,
					datetime: `${dateSplit[2]}-${dateSplit[1]}-${dateSplit[0]}T${timeSplit[0]}:${timeSplit[1]}`,
					date: `${dateSplit[2]}-${dateSplit[1]}-${dateSplit[0]}`,
					time: `${timeSplit[0]}:${timeSplit[1]}`,
					team1: $(this).find('td').eq(1).text().trim(),
					team2: $(this).find('td').eq(2).text().trim(),
					result: $(this).find('td').eq(3).text().trim(),
				};
				if (game.result === '_:_') {
					game.result = '';
				}
				matchDay.games.push(game);

				// TODO: Take the date which have most of the matches in case of movements
				if (matchDay.date === null) {
					matchDay.date = new Date(game.datetime);
				}

				// own match
				if (game.team1 === team.name || game.team2 === team.name) {
					let match = {
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
			}
		});		

		let currentMatchDay = null;
		let mostRecentPastDate = null;
		let today = stfvData.getCurrentDate();
		today.setHours(0, 0, 0, 0); 
		allMatchdays.forEach((matchDay, index) => {
 			let matchDate = matchDay.date;
			if (matchDate < today && (!mostRecentPastDate || matchDate > mostRecentPastDate)) {
				mostRecentPastDate = matchDate;
				currentMatchDay = matchDay;
				currentMatchDay.index = index;
			}
		});

		if (currentMatchDay == null) {
			currentMatchDay = allMatchdays[0];
			currentMatchDay.index = 0;
		}

		currentMatchDay.table = leagueTable;

		// Sort Matches
		matches.sort((a,b) => (a.matchDay > b.matchDay) ? 1 : ((b.matchDay > a.matchDay) ? -1 : 0))

		return { currentMatchDay: currentMatchDay, matchDays: allMatchdays, matches: matches };

	},

	getCurrentDate() {
		return tffTools.getCurrentDate();
	},

};