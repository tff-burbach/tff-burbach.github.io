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

	async collectCupData(team) {
		const stfvCupHTML = await stfvData.fetchCupFromStfv(team);
		return stfvData.extractCupData(team, stfvCupHTML);
	},

	getLeagueUrl(leaguename, matchdayno, year, category, groupNo) {
		year = year ? year : new Date().getFullYear();
		category = category ? encodeURIComponent(category) : 'Ligabetrieb+Classic';
		leaguename = leaguename.replace(' ', '+').replace('ü','%FC');
		groupNo = groupNo ? groupNo : 'Ligaphase';
		const stfvURL = `https://stfv.de/teamsport/classic-ligen/classic-landesliga?a=b`;
		const stfvURLEncoded = encodeURI(stfvURL);
		return USE_PROXY ? `https://api.codetabs.com/v1/proxy?quest=${stfvURLEncoded}` : stfvURL;
	},

	getBackupLeagueUrl(leaguename, matchdayno, year, category, groupNo) {
		return '/stfv/landesliga-classic.html';
	},

	getCupUrl(year) {
		year = year ? year : new Date().getFullYear();
		const stfvURL = `https://stfv.de/teamsport/classic-ligen/classic-pokal`;
		const stfvURLEncoded = encodeURI(stfvURL);
		return USE_PROXY ? `https://api.codetabs.com/v1/proxy?quest=${stfvURLEncoded}` : stfvURL;
	},

	getBackupCupUrl() {
		return '/stfv/pokal-classic.html';
	},

	async fetchCupFromStfv(team) {
		var response;
		try {
			const url = stfvData.getCupUrl(team.year);
			response = await $.get({url: url, cache: false});
		}
		catch (ex) {
			const url = stfvData.getBackupCupUrl();
			response = await $.get({url: url, cache: false});
		}
		var html = response;
		var stfvCup = document.createElement('div');
		stfvCup.innerHTML = html;
		return stfvCup;
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
			let gamesPlayed = parseInt($(this).find('td').eq(3).text().trim());
			let plusPoints = parseInt($(this).find('td').eq(11).text().trim());
			let totalPoints = gamesPlayed * 2;
			let minusPoints = totalPoints - plusPoints;

			let team = {
				place: $(this).find('td').eq(0).text().trim(),
				team: $(this).find('td').eq(1).text().trim(),
				games: gamesPlayed,
				wins: $(this).find('td').eq(4).text().trim(),
				draws: $(this).find('td').eq(5).text().trim(),
				losses: $(this).find('td').eq(6).text().trim(),
				goals: $(this).find('td').eq(7).text().trim(),
				goals_diff: $(this).find('td').eq(8).text().trim(),
				sets: $(this).find('td').eq(9).text().trim(),
				sets_diff: $(this).find('td').eq(10).text().trim(),
				scores: plusPoints + ':' + minusPoints,
				plusPoints: plusPoints,
				minusPoints: minusPoints
			};
			leagueTable.push(team);
		});

		// Games
		let matches = [];
		let matchDay;
		let allMatchdays = [];
		let dateCount = {}; // Tracks date frequencies for the current matchday

		$("table.contentpaneopen:not(.dtfl-table-medium) tr", stfvTableHtml).each(function() {

			if ($(this).hasClass('sectiontableheader')) {

				// Before starting a new matchday: finalize previous matchday date selection
				if (matchDay && Object.keys(dateCount).length > 0) {
					const topDate = Object.entries(dateCount).sort((a,b) => b[1] - a[1])[0][0];
					matchDay.date = new Date(topDate + "T00:00");
				}

				// Reset for new matchday
				dateCount = {};

				// Extract the match day
				if ($(this).find('th').text().indexOf('Spieltag') > 0) {
					matchDayText = $(this).find('th').text().trim();
					matchDay = { 
						no: parseInt(matchDayText.match(/\d+/)[0]),
						text: matchDayText,
						date: null,
						games: []
					};
					allMatchdays.push(matchDay);
				}

			} else if ($(this).hasClass('sectiontableentry1') || $(this).hasClass('sectiontableentry2')) {

				// Extract match information
				let dateTimeStr = $(this).find('td').eq(0).text().trim();
				let [date, time] = dateTimeStr.split(' ').slice(1);
				let dateSplit = date.split(".");
				let timeSplit = time.split(":");

				let isoDate = `${dateSplit[2]}-${dateSplit[1]}-${dateSplit[0]}`;
				let isoDatetime = `${isoDate}T${timeSplit[0]}:${timeSplit[1]}`;

				let rawResult = $(this).find('td').eq(3).text().trim();
				let resultHasSuffix = false;
				let cleanResult = rawResult;

				// Check for letter suffix (like "live", "n.V.", etc.)
				// BUT NOT for dates in format (DD.MM.)
				const suffixMatch = rawResult.match(/^(\d+:\d+)\s*([a-zA-Z.]+)$/);
				const isDateFormat = rawResult.match(/\(\d+\.\d+\.\)/); // Matches (17.4.)

				if (suffixMatch && !isDateFormat) {
					cleanResult = suffixMatch[1]; // Extract only the score
					resultHasSuffix = true;
				}

				let game = {
					matchDay: matchDay.no,
					datetime: isoDatetime,
					date: isoDate,
					time: `${timeSplit[0]}:${timeSplit[1]}`,
					team1: $(this).find('td').eq(1).text().trim(),
					team2: $(this).find('td').eq(2).text().trim(),
					result: cleanResult,
					resultHasSuffix: resultHasSuffix
				};

				if (game.result.includes('_:_')) {
					game.result = '';
				}

				matchDay.games.push(game);

				// TODO RESOLVED: track date frequency for the matchday
				dateCount[isoDate] = (dateCount[isoDate] || 0) + 1;

				// own match
				if (game.team1 === team.name || game.team2 === team.name) {
					let match = {
						matchDay: game.matchDay,
						datetime: game.datetime,
						date: game.date,
						time: game.time,
						result: game.result,
						resultHasSuffix: game.resultHasSuffix
					};
					if (game.team1 === team.name) {
						match.home = true;
						match.opponent = game.team2;
					} else {
						match.home = false;
						match.opponent = game.team1;
					}
					matches.push(match);
				}
			}
		});

		// After loop ends: finalize last matchday as well
		if (matchDay && Object.keys(dateCount).length > 0) {
			const topDate = Object.entries(dateCount).sort((a,b) => b[1] - a[1])[0][0];
			matchDay.date = new Date(topDate + "T00:00");
		}

		let currentMatchDay = null;
		let mostRecentPastDate = null;
		let today = stfvData.getCurrentDate();
		today.setHours(0, 0, 0, 0); 
		allMatchdays.forEach((matchDay, index) => {
 			let matchDate = matchDay.date;
			if (matchDate <= today && (!mostRecentPastDate || matchDate > mostRecentPastDate)) {
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

	extractCupData: function (team, stfvCupHtml) {
		// Cup matches (no league table for cup)
		let matches = [];
		let roundName = null;

		$("table.contentpaneopen tr", stfvCupHtml).each(function() {

			if ($(this).hasClass('sectiontableheader')) {
				// Extract the round name (e.g., "1. Runde - Vorrunde")
				roundName = $(this).find('th').text().trim();

			} else if ($(this).hasClass('sectiontableentry1') || $(this).hasClass('sectiontableentry2')) {

				// Extract match information
				let dateTimeStr = $(this).find('td').eq(0).text().trim();
				let [, date, time] = dateTimeStr.split(' ');

				if (!date || !time) return; // Skip invalid entries

				let dateSplit = date.split(".");
				let timeSplit = time.split(":");

				let isoDate = `${dateSplit[2]}-${dateSplit[1]}-${dateSplit[0]}`;
				let isoDatetime = `${isoDate}T${timeSplit[0]}:${timeSplit[1]}`;

				let team1 = $(this).find('td').eq(1).text().trim();
				let team2 = $(this).find('td').eq(2).text().trim();
				let result = $(this).find('td').eq(3).text().trim();

				if (result.includes('_:_')) {
					result = '';
				}

				// Check if this is our team's match
				if (team1 === team.name || team2 === team.name) {
					let match = {
						datetime: isoDatetime,
						date: isoDate,
						time: `${timeSplit[0]}:${timeSplit[1]}`,
						result: result,
						round: roundName
					};
					if (team1 === team.name) {
						match.home = true;
						match.opponent = team2;
					} else {
						match.home = false;
						match.opponent = team1;
					}
					matches.push(match);
				}
			}
		});

		return { matches: matches };
	},

};