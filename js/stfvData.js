/**
 * STFV data access
 */

const USE_PROXY = true;
const STFV_PROXY_URL_BUILDERS = [
	(url) => `https://quiet-waterfall-441f.ralph-kiefer.workers.dev/?url=${encodeURIComponent(url)}`,
	(url) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
	(url) => `https://corsproxy.io/?${encodeURIComponent(url)}`
];

stfvData = {

	_liveFetchErrorShown: false,

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
		return `https://stfv.de/teamsport/classic-ligen/classic-landesliga`;
	},

	getBackupLeagueUrl(leaguename, matchdayno, year, category, groupNo) {
		return '/stfv/landesliga-classic.html';
	},

	getCupUrl(year) {
		year = year ? year : new Date().getFullYear();
		return `https://stfv.de/teamsport/classic-ligen/classic-pokal`;
	},

	getProxyUrls(url) {
		if (!USE_PROXY) {
			return [url];
		}
		return STFV_PROXY_URL_BUILDERS.map((buildUrl) => buildUrl(url));
	},

	showDataError(message) {
		if (typeof tffTools !== 'undefined' && typeof tffTools.showToast === 'function') {
			tffTools.showToast(message);
			return;
		}
		alert(message);
	},

	notifyLiveFetchFallback() {
		if (stfvData._liveFetchErrorShown) {
			return;
		}
		stfvData._liveFetchErrorShown = true;
		stfvData.showDataError('STFV Live-Daten konnten nicht geladen werden. Es werden Sicherungsdaten verwendet.');
	},

	notifyFetchTotalFailure() {
		stfvData.showDataError('STFV-Daten konnten nicht geladen werden. Auch die Sicherungsdaten sind nicht verfuegbar.');
	},

	async fetchFromStfv(url) {
		let lastError;
		const urls = stfvData.getProxyUrls(url);
		for (const currentUrl of urls) {
			try {
				const response = await $.get({url: currentUrl, cache: false, timeout: 10000});
				stfvData._liveFetchErrorShown = false;
				return response;
			}
			catch (ex) {
				lastError = ex;
			}
		}
		throw lastError;
	},

	getBackupCupUrl() {
		return '/stfv/pokal-classic.html';
	},

	async fetchCupFromStfv(team) {
		var response;
		try {
			const sourceUrl = stfvData.getCupUrl(team.year);
			response = await stfvData.fetchFromStfv(sourceUrl);
		}
		catch (ex) {
			stfvData.notifyLiveFetchFallback();
			try {
				const url = stfvData.getBackupCupUrl();
				response = await $.get({url: url, cache: false});
			}
			catch (backupEx) {
				stfvData.notifyFetchTotalFailure();
				throw backupEx;
			}
		}
		var html = response;
		var stfvCup = document.createElement('div');
		stfvCup.innerHTML = html;
		return stfvCup;
	},

	async fetchTableFromStfv(team, matchdayno, category, groupNo) {
		var response;
		try {
			const sourceUrl = stfvData.getLeagueUrl(team.league, matchdayno, team.year, category, groupNo);
			response = await stfvData.fetchFromStfv(sourceUrl);
		}
		catch (ex) {
			stfvData.notifyLiveFetchFallback();
			try {
				const url = stfvData.getBackupLeagueUrl(team.league, matchdayno, team.year, category, groupNo);
				response = await $.get({url: url, cache: false});
			}
			catch (backupEx) {
				stfvData.notifyFetchTotalFailure();
				throw backupEx;
			}
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
			let gamesPlayed = parseInt($(this).find('td').eq(3).text().replace(/\s+/g, ' ').trim());
			let plusPoints = parseInt($(this).find('td').eq(11).text().replace(/\s+/g, ' ').trim());
			let totalPoints = gamesPlayed * 2;
			let minusPoints = totalPoints - plusPoints;

			let team = {
				place: $(this).find('td').eq(0).text().replace(/\s+/g, ' ').trim(),
				team: $(this).find('td').eq(1).text().replace(/\s+/g, ' ').trim(),
				games: gamesPlayed,
				wins: $(this).find('td').eq(4).text().replace(/\s+/g, ' ').trim(),
				draws: $(this).find('td').eq(5).text().replace(/\s+/g, ' ').trim(),
				losses: $(this).find('td').eq(6).text().replace(/\s+/g, ' ').trim(),
				goals: $(this).find('td').eq(7).text().replace(/\s+/g, ' ').trim(),
				goals_diff: $(this).find('td').eq(8).text().replace(/\s+/g, ' ').trim(),
				sets: $(this).find('td').eq(9).text().replace(/\s+/g, ' ').trim(),
				sets_diff: $(this).find('td').eq(10).text().replace(/\s+/g, ' ').trim(),
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
					matchDayText = $(this).find('th').text().replace(/\s+/g, ' ').trim();
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
				let dateTimeStr = $(this).find('td').eq(0).text().replace(/\s+/g, ' ').trim();
				let [date, time] = dateTimeStr.split(' ').slice(1);
				let dateSplit = date.split(".");
				let timeSplit = time.split(":");

				let isoDate = `${dateSplit[2]}-${dateSplit[1]}-${dateSplit[0]}`;
				let isoDatetime = `${isoDate}T${timeSplit[0]}:${timeSplit[1]}`;

				let rawResult = $(this).find('td').eq(3).text().replace(/\s+/g, ' ').trim();
				let resultHasSuffix = false;
				let cleanResult = rawResult;

				// Check for letter suffix (like "live", "n.V.", etc.)
				// BUT NOT for dates in format (DD.MM.)
				const suffixMatch = rawResult.match(/^(\d+:\d+)\s*([^\d\s]\S*)$/);
				const isDateFormat = rawResult.match(/\(\d+\.\d+\.\)/); // Matches (17.4.)

				if (suffixMatch && !isDateFormat) {
					cleanResult = suffixMatch[1] + '*';
					resultHasSuffix = true;
				}

				let game = {
					matchDay: matchDay.no,
					datetime: isoDatetime,
					date: isoDate,
					time: `${timeSplit[0]}:${timeSplit[1]}`,
					team1: $(this).find('td').eq(1).text().replace(/\s+/g, ' ').trim(),
					team2: $(this).find('td').eq(2).text().replace(/\s+/g, ' ').trim(),
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
				roundName = $(this).find('th').text().replace(/\s+/g, ' ').trim();

			} else if ($(this).hasClass('sectiontableentry1') || $(this).hasClass('sectiontableentry2')) {

				// Extract match information
				let dateTimeStr = $(this).find('td').eq(0).text().replace(/\s+/g, ' ').trim();
				let [, date, time] = dateTimeStr.split(' ');

				if (!date || !time) return; // Skip invalid entries

				let dateSplit = date.split(".");
				let timeSplit = time.split(":");

				let isoDate = `${dateSplit[2]}-${dateSplit[1]}-${dateSplit[0]}`;
				let isoDatetime = `${isoDate}T${timeSplit[0]}:${timeSplit[1]}`;

				let team1 = $(this).find('td').eq(1).text().replace(/\s+/g, ' ').trim();
				let team2 = $(this).find('td').eq(2).text().replace(/\s+/g, ' ').trim();
				let result = $(this).find('td').eq(3).text().replace(/\s+/g, ' ').trim();

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