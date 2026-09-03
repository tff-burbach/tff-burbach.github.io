/**
 * STFV data access
 */

const USE_PROXY = true;
const STFV_PROXY_URL_BUILDERS = [
	(url) => `https://quiet-waterfall-441f.ralph-kiefer.workers.dev/?url=${encodeURIComponent(url)}`,
];

stfvData = {

	_liveFetchErrorShown: false,

	async getLeagueData(team) {
		const stfvTableHTML = await stfvData.fetchTableFromStfv();
		return stfvData.extractLeagueData(team, stfvTableHTML);
	},

	async collectLeagueData(team) {
		return stfvData.getLeagueData(team);
	},

	async collectPlayoffLeagueData(team) {
		return stfvData.getLeagueData(team);
	},

	async collectCupData(team) {
		const stfvCupHTML = await stfvData.fetchCupFromStfv(team);
		return stfvData.extractCupData(team, stfvCupHTML);
	},

	getLeagueUrl() {
		return `https://stfv.de/teamsport/classic-ligen/classic-landesliga`;
	},

	getBackupLeagueUrl() {
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

	async fetchTableFromStfv() {
		var response;
		try {
			const sourceUrl = stfvData.getLeagueUrl();
			response = await stfvData.fetchFromStfv(sourceUrl);
		}
		catch (ex) {
			stfvData.notifyLiveFetchFallback();
			try {
				const url = stfvData.getBackupLeagueUrl();
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

	_buildLeagueColMap: function(leagueTable) {
		const map = { place: 0, team: 1, games: 3, wins: 4, draws: 5, losses: 6, goals: 7, goals_diff: 8, sets: 9, sets_diff: 10, points: 11 };
		const headerRow = $('tr.sectiontableheader', leagueTable).first();
		if (!headerRow.length) return map;
		headerRow.find('th').each(function(i) {
			const title = ($(this).attr('title') || '').toLowerCase();
			const text = $(this).text().replace(/\s+/g, ' ').trim().toLowerCase();
			if (text === 'platz') map.place = i;
			else if (text === 'mannschaft') map.team = i;
			else if (title === 'begegnungen') map.games = i;
			else if (title === 'siege') map.wins = i;
			else if (title === 'unentschieden') map.draws = i;
			else if (title === 'niederlagen') map.losses = i;
			else if (text.includes('tore') && text.includes('absolut')) map.goals = i;
			else if (text.includes('tore')) map.goals_diff = i;
			else if (text.includes('spielpunkte') && text.includes('absolut')) map.sets = i;
			else if (text === 'spiele' || title === 'punktedifferenz') map.sets_diff = i;
			else if (text === 'punkte') map.points = i;
		});
		return map;
	},

	_buildMatchColMap: function(matchTables) {
		const map = { datetime: 0, team1: 1, team2: 2, result: 3 };
		$('tr.sectiontableheader', matchTables).each(function() {
			if ($(this).find('th').length < 3) return; // skip single-th matchday headers
			$(this).find('th').each(function(i) {
				const text = $(this).text().replace(/\s+/g, ' ').trim().toLowerCase();
				if (text.includes('zeitpunkt')) map.datetime = i;
				else if (text === 'heim') map.team1 = i;
				else if (text === 'gast') map.team2 = i;
				else if (text.includes('ergebnis')) map.result = i;
			});
			return false; // stop after first column-header row
		});
		return map;
	},

	extractLeagueData: function (team, stfvTableHtml) {
		const leagueColMap = stfvData._buildLeagueColMap($('table.dtfl-table-medium', stfvTableHtml));
		const matchColMap = stfvData._buildMatchColMap($('table.contentpaneopen:not(.dtfl-table-medium)', stfvTableHtml));

		// League Table
		let leagueTable = [];
		$("table.dtfl-table-medium tr.sectiontableentry1, table.dtfl-table-medium tr.sectiontableentry2", stfvTableHtml).each(function() {
			const col = (i) => $(this).find('td').eq(i).text().replace(/\s+/g, ' ').trim();
			let gamesPlayed = parseInt(col(leagueColMap.games));
			let plusPoints = parseInt(col(leagueColMap.points));
			let totalPoints = gamesPlayed * 2;
			let minusPoints = totalPoints - plusPoints;

			let entry = {
				place: col(leagueColMap.place),
				team: col(leagueColMap.team),
				games: gamesPlayed,
				wins: col(leagueColMap.wins),
				draws: col(leagueColMap.draws),
				losses: col(leagueColMap.losses),
				goals: col(leagueColMap.goals),
				goals_diff: col(leagueColMap.goals_diff),
				sets: col(leagueColMap.sets),
				sets_diff: col(leagueColMap.sets_diff),
				scores: plusPoints + ':' + minusPoints,
				plusPoints: plusPoints,
				minusPoints: minusPoints
			};
			leagueTable.push(entry);
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
				const col = (i) => $(this).find('td').eq(i).text().replace(/\s+/g, ' ').trim();
				let dateTimeStr = col(matchColMap.datetime);
				let [date, time] = dateTimeStr.split(' ').slice(1);
				let dateSplit = date.split(".");
				let timeSplit = time.split(":");

				let isoDate = `${dateSplit[2]}-${dateSplit[1]}-${dateSplit[0]}`;
				let isoDatetime = `${isoDate}T${timeSplit[0]}:${timeSplit[1]}`;

				let rawResult = col(matchColMap.result);
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
					team1: col(matchColMap.team1),
					team2: col(matchColMap.team2),
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

	getClubUrl(clubId) {
		return `https://stfv.de/verband/vereine?task=verein_details&id=${clubId}`;
	},

	async fetchClubFromStfv(clubId) {
		const sourceUrl = stfvData.getClubUrl(clubId);
		let response;
		try {
			response = await stfvData.fetchFromStfv(sourceUrl);
		} catch (ex) {
			stfvData.showDataError('STFV Vereinsdaten konnten nicht geladen werden.');
			throw ex;
		}
		const div = document.createElement('div');
		div.innerHTML = response;
		return div;
	},

	extractTeamMembers(clubHtml) {
		const members = [];
		const seen = new Set();

		// Name is in td[0], photo is in td[1] of the same row
		$(clubHtml).find('img[src*="/images/sportsmanager/spieler/"]').each(function () {
			const rawSrc = $(this).attr('src') || '';
			const photoUrl = rawSrc.startsWith('http') ? rawSrc : 'https://stfv.de' + rawSrc;
			const $td0 = $(this).closest('tr').find('td').eq(0);
			const name = $td0.find('a').first().text().replace(/\s+/g, ' ').trim();
			const passNr = $td0.find('small').first().text().replace(/\s+/g, ' ').trim();
			if (name && !seen.has(name)) {
				seen.add(name);
				members.push({ name, photoUrl, passNr });
			}
		});

		// Fallback: td with sectiontableentry class that has an anchor (no photo)
		$(clubHtml).find('td.sectiontableentry1 a, td.sectiontableentry2 a').each(function () {
			const name = $(this).text().replace(/\s+/g, ' ').trim();
			const passNr = $(this).closest('td').find('small').first().text().replace(/\s+/g, ' ').trim();
			if (name && !seen.has(name)) {
				seen.add(name);
				members.push({ name, photoUrl: null, passNr });
			}
		});

		members.sort((a, b) => {
			const lastName = n => n.split(',')[0].trim().toLowerCase();
			return lastName(a.name).localeCompare(lastName(b.name), 'de');
		});

		return members;
	},

	async collectTeamMembers(clubId) {
		const html = await stfvData.fetchClubFromStfv(clubId);
		return stfvData.extractTeamMembers(html);
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