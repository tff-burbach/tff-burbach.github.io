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
		return (await stfvData.collectAllLeagueData(team)).leagueData;
	},

	async collectPlayoffLeagueData(team) {
		return (await stfvData.collectAllLeagueData(team)).playoffData;
	},

	async collectAllLeagueData(team) {
		const html = await stfvData.fetchTableFromStfv();
		const dtflCount = $('table.dtfl-table-medium', html).length;
		console.log('[STFV] collectAllLeagueData: dtfl-tables=', dtflCount, 'team=', team.name);

		if (dtflCount <= 1) {
			// Regular season: single competition on main page
			const $leagueTable = $('table.dtfl-table-medium', html).first();
			const leagueTable = stfvData._extractLeagueTableRows($leagueTable);
			const matchData = stfvData._extractMatchData(team, html);
			const currentMatchDay = stfvData._determineCurrentMatchday(matchData.allMatchdays)
				|| { index: 0, no: 0, text: '', date: null, games: [] };
			currentMatchDay.table = leagueTable;
			const leagueData = {
				currentMatchDay,
				matchDays: matchData.allMatchdays,
				matches: matchData.matches
			};
			return { leagueData, playoffData: null };
		}

		// Post-season: multiple competitions on page
		const blocks = stfvData._extractCompetitionBlocks(html, team.name);
		console.log('[STFV] post-season blocks:', blocks.map(b => ({
			name: b.name, rows: b.leagueTable ? b.leagueTable.find('tr').length : 0
		})));

		const ligaphaseBlock = blocks.find(b => {
			const n = b.name.toLowerCase();
			return !n.includes('playoff') && !n.includes('abstieg')
				&& stfvData._teamInLeagueTable(team.name, b.leagueTable);
		}) || blocks.find(b => {
			const n = b.name.toLowerCase();
			return !n.includes('playoff') && !n.includes('abstieg');
		}) || blocks[0];

		// Prefer the block where the team IS present (Playoff vs Abstieg).
		// Fallback by name so the section always shows when a post-season exists.
		const playoffBlock = blocks.find(b => {
			const n = b.name.toLowerCase();
			return (n.includes('playoff') || n.includes('abstieg')) &&
				stfvData._teamInLeagueTable(team.name, b.leagueTable);
		}) || blocks.find(b => b.name.toLowerCase().includes('playoff'))
		  || blocks.find(b => b.name.toLowerCase().includes('abstieg'));

		console.log('[STFV] ligaphaseBlock:', ligaphaseBlock && ligaphaseBlock.name,
			'playoffBlock:', playoffBlock && playoffBlock.name);

		if (!ligaphaseBlock) {
			// Safety fallback: use the dtfl-type table containing the team, or the largest one
			let $fallbackTable = null;
			$('table[class*="dtfl-table"]', html).each(function() {
				if (stfvData._teamInLeagueTable(team.name, $(this))) { $fallbackTable = $(this); return false; }
			});
			if (!$fallbackTable) $fallbackTable = $('table.dtfl-table-medium', html).last();
			const leagueTable = stfvData._extractLeagueTableRows($fallbackTable);
			const matchData = stfvData._extractMatchData(team, html);
			const currentMatchDay = stfvData._determineCurrentMatchday(matchData.allMatchdays)
				|| { index: 0, no: 0, text: '', date: null, games: [] };
			currentMatchDay.table = leagueTable;
			return { leagueData: { currentMatchDay, matchDays: matchData.allMatchdays, matches: matchData.matches }, playoffData: null };
		}

		// Ligaphase: fetch match schedule from sub-page
		const ligaphaseTable = stfvData._extractLeagueTableRows(ligaphaseBlock.leagueTable);
		let ligaphaseMatchData = { allMatchdays: [], matches: [] };
		if (ligaphaseBlock.begegnungenUrl) {
			try {
				console.log('[STFV] fetching ligaphase matches from:', ligaphaseBlock.begegnungenUrl);
				const begHtml = await stfvData.fetchBegegnungenFromStfv(ligaphaseBlock.begegnungenUrl);
				const cpTables = $('table.contentpaneopen:not(.dtfl-table-medium)', begHtml).length;
				console.log('[STFV] ligaphase begHtml contentpaneopen tables:', cpTables);
				ligaphaseMatchData = stfvData._extractMatchData(team, begHtml);
				console.log('[STFV] ligaphase matches:', ligaphaseMatchData.matches.length, 'matchdays:', ligaphaseMatchData.allMatchdays.length);
			} catch (ex) {
				console.warn('[STFV] ligaphase fetch failed:', ex);
				ligaphaseMatchData = stfvData._extractMatchData(team, html);
			}
		} else {
			ligaphaseMatchData = stfvData._extractMatchData(team, html);
		}
		const ligaphaseCurrentMatchDay = stfvData._determineCurrentMatchday(ligaphaseMatchData.allMatchdays)
			|| { index: 0, no: 0, text: '', date: null, games: [] };
		ligaphaseCurrentMatchDay.table = ligaphaseTable;
		const leagueData = {
			currentMatchDay: ligaphaseCurrentMatchDay,
			matchDays: ligaphaseMatchData.allMatchdays,
			matches: ligaphaseMatchData.matches
		};

		// Playoff / Abstiegsrunde: fetch match schedule from sub-page
		let playoffData = null;
		if (playoffBlock) {
			const playoffTable = stfvData._extractLeagueTableRows(playoffBlock.leagueTable);
			let playoffMatchData = { allMatchdays: [], matches: [] };
			if (playoffBlock.begegnungenUrl) {
				try {
					console.log('[STFV] fetching playoff matches from:', playoffBlock.begegnungenUrl);
					const begHtml = await stfvData.fetchBegegnungenFromStfv(playoffBlock.begegnungenUrl);
					const cpTables = $('table.contentpaneopen:not(.dtfl-table-medium)', begHtml).length;
					console.log('[STFV] playoff begHtml contentpaneopen tables:', cpTables);
					playoffMatchData = stfvData._extractMatchData(team, begHtml);
					console.log('[STFV] playoff matches:', playoffMatchData.matches.length, 'matchdays:', playoffMatchData.allMatchdays.length);
				} catch (ex) {
					console.warn('[STFV] playoff fetch failed:', ex);
				}
			}
			const playoffCurrentMatchDay = stfvData._determineCurrentMatchday(playoffMatchData.allMatchdays)
				|| { index: 0, no: 0, text: '', date: null, games: [] };
			playoffCurrentMatchDay.table = playoffTable;
			playoffData = {
				currentMatchDay: playoffCurrentMatchDay,
				matchDays: playoffMatchData.allMatchdays,
				matches: playoffMatchData.matches,
				competitionName: playoffBlock.name
			};
		}

		return { leagueData, playoffData };
	},

	async collectCupData(team) {
		const stfvCupHTML = await stfvData.fetchCupFromStfv(team);
		return stfvData.extractCupData(team, stfvCupHTML);
	},

	_extractCompetitionBlocks: function(html, teamName) {
		const seenIds = new Set();
		const ids = [];
		const begUrls = [];
		// Prefer explicit begegnungen links (non-iCal)
		$('a[href*="task=veranstaltung_begegnungen"]', html).each(function() {
			const href = $(this).attr('href') || '';
			if (href.includes('_ical')) return;
			const idMatch = href.match(/[?&]id=(\d+)/);
			if (!idMatch || seenIds.has(idMatch[1])) return;
			seenIds.add(idMatch[1]);
			ids.push(idMatch[1]);
			begUrls.push(href.split('&alarm')[0]);
		});
		// Derive from iCal links
		$('a[href*="veranstaltung_begegnungen_ical"]', html).each(function() {
			const href = $(this).attr('href') || '';
			const idMatch = href.match(/[?&]id=(\d+)/);
			if (!idMatch || seenIds.has(idMatch[1])) return;
			seenIds.add(idMatch[1]);
			ids.push(idMatch[1]);
			const baseUrl = href.split('?')[0];
			begUrls.push(`${baseUrl}?task=veranstaltung_begegnungen&id=${idMatch[1]}`);
		});
		// Derive from veranstaltungid links (post-season competition overview links)
		// These overview pages contain both standings and match schedule data
		$('a[href*="veranstaltungid="]', html).each(function() {
			const href = $(this).attr('href') || '';
			const idMatch = href.match(/[?&]veranstaltungid=(\d+)/);
			if (!idMatch || seenIds.has(idMatch[1])) return;
			seenIds.add(idMatch[1]);
			ids.push(idMatch[1]);
			const absHref = href.startsWith('http') ? href : `https://stfv.de${href}`;
			begUrls.push(absHref);
		});

		// Primary: walk H2 + dtfl-table-medium in document order
		const blocks = [];
		let currentName = null;
		$('H2, h2, table.dtfl-table-medium', html).each(function() {
			const $el = $(this);
			if ($el.is('table') && $el.hasClass('dtfl-table-medium')) {
				if (currentName !== null) {
					const i = blocks.length;
					blocks.push({ name: currentName, id: ids[i], begegnungenUrl: begUrls[i], leagueTable: $el });
					currentName = null;
				}
			} else {
				currentName = $el.text().replace(/\s+/g, ' ').trim() || null;
			}
		});

		// Fallback: no headings — synthesize blocks from dtfl-type tables by content
		if (blocks.length === 0 && teamName) {
			const allDtflTables = [];
			$('table[class*="dtfl-table"]', html).each(function() { allDtflTables.push($(this)); });

			// Ligaphase = table with MOST rows among tables that contain teamName
			// (Landesliga always has more teams than Playoff/Abstiegsrunde)
			const tablesWithTeam = allDtflTables.filter(t => stfvData._teamInLeagueTable(teamName, t));
			let ligaphaseTable = tablesWithTeam.length
				? tablesWithTeam.reduce((best, t) => t.find('tr').length > best.find('tr').length ? t : best, tablesWithTeam[0])
				: allDtflTables.length
					? allDtflTables.reduce((best, t) => t.find('tr').length > best.find('tr').length ? t : best, allDtflTables[0])
					: null;
			if (ligaphaseTable) {
				// STFV post-season: Landesliga section is last on page → last iCal link
				const ligaBegIdx = ids.length > 0 ? ids.length - 1 : -1;
				blocks.push({
					name: 'Landesliga',
					id: ligaBegIdx >= 0 ? ids[ligaBegIdx] : undefined,
					begegnungenUrl: ligaBegIdx >= 0 ? begUrls[ligaBegIdx] : undefined,
					leagueTable: ligaphaseTable
				});
			}
			// Playoff = first iCal section (post-season shown first on STFV page)
			const playoffTable = allDtflTables.find(t => t !== ligaphaseTable &&
				stfvData._teamInLeagueTable(teamName, t));
			blocks.push({
				name: 'Landesliga Playoff',
				id: ids.length > 0 ? ids[0] : undefined,
				begegnungenUrl: ids.length > 0 ? begUrls[0] : undefined,
				leagueTable: playoffTable || $()
			});
			console.log('[STFV] synthesized blocks:', blocks.map(b => ({
				name: b.name, rows: b.leagueTable ? b.leagueTable.find('tr').length : 0
			})));
		}

		return blocks;
	},

	_teamInLeagueTable: function(teamName, $leagueTable) {
		if (!$leagueTable || !$leagueTable.length) return false;
		const normalized = teamName.replace(/\s+/g, ' ').trim();
		let found = false;
		let $rows = $leagueTable.find('tr.sectiontableentry1, tr.sectiontableentry2');
		if (!$rows.length) $rows = $leagueTable.find('tr');
		$rows.each(function() {
			if ($(this).text().replace(/\s+/g, ' ').indexOf(normalized) >= 0) {
				found = true; return false;
			}
		});
		return found;
	},

	_extractLeagueTableRows: function($leagueTable) {
		if (!$leagueTable || !$leagueTable.length) return [];
		const leagueColMap = stfvData._buildLeagueColMap($leagueTable);
		const rows = [];
		$leagueTable.find('tr.sectiontableentry1, tr.sectiontableentry2').each(function() {
			const col = (i) => $(this).find('td').eq(i).text().replace(/\s+/g, ' ').trim();
			const gamesPlayed = parseInt(col(leagueColMap.games));
			const plusPoints = parseInt(col(leagueColMap.points));
			const totalPoints = isNaN(gamesPlayed) ? 0 : gamesPlayed * 2;
			const minusPoints = isNaN(plusPoints) ? 0 : totalPoints - plusPoints;
			rows.push({
				place: col(leagueColMap.place),
				team: col(leagueColMap.team),
				games: isNaN(gamesPlayed) ? '' : gamesPlayed,
				wins: col(leagueColMap.wins),
				draws: col(leagueColMap.draws),
				losses: col(leagueColMap.losses),
				goals: col(leagueColMap.goals),
				goals_diff: col(leagueColMap.goals_diff),
				sets: col(leagueColMap.sets),
				sets_diff: col(leagueColMap.sets_diff),
				scores: isNaN(plusPoints) ? '' : (plusPoints + ':' + minusPoints),
				plusPoints: isNaN(plusPoints) ? 0 : plusPoints,
				minusPoints: isNaN(minusPoints) ? 0 : minusPoints
			});
		});
		return rows;
	},

	_extractMatchData: function(team, html) {
		const matchColMap = stfvData._buildMatchColMap($('table.contentpaneopen:not(.dtfl-table-medium)', html));
		let matches = [];
		let matchDay = null;
		let allMatchdays = [];
		let dateCount = {};

		$("table.contentpaneopen:not(.dtfl-table-medium) tr", html).each(function() {
			if ($(this).hasClass('sectiontableheader')) {
				if (matchDay && Object.keys(dateCount).length > 0) {
					const topDate = Object.entries(dateCount).sort((a,b) => b[1] - a[1])[0][0];
					matchDay.date = new Date(topDate + "T00:00");
				}
				dateCount = {};
				if ($(this).find('th').text().indexOf('Spieltag') > 0) {
					const matchDayText = $(this).find('th').text().replace(/\s+/g, ' ').trim();
					matchDay = { no: parseInt(matchDayText.match(/\d+/)[0]), text: matchDayText, date: null, games: [] };
					allMatchdays.push(matchDay);
				}
			} else if ($(this).hasClass('sectiontableentry1') || $(this).hasClass('sectiontableentry2')) {
				if (!matchDay) return;
				const col = (i) => $(this).find('td').eq(i).text().replace(/\s+/g, ' ').trim();
				const dateTimeStr = col(matchColMap.datetime);
				const parts = dateTimeStr.split(' ');
				const date = parts[1]; const time = parts[2];
				if (!date || !time) return;
				const dateSplit = date.split(".");
				const timeSplit = time.split(":");
				const isoDate = `${dateSplit[2]}-${dateSplit[1]}-${dateSplit[0]}`;
				const isoDatetime = `${isoDate}T${timeSplit[0]}:${timeSplit[1]}`;
				const rawResult = matchColMap.result !== null
					? col(matchColMap.result)
					: $(this).find('td').last().text().replace(/\s+/g, ' ').trim();
				let cleanResult = rawResult;
				let resultHasSuffix = false;
				const suffixMatch = rawResult.match(/^(\d+:\d+)\s*([^\d\s]\S*)$/);
				const isDateFormat = rawResult.match(/\(\d+\.\d+\.\)/);
				if (suffixMatch && !isDateFormat) { cleanResult = suffixMatch[1] + '*'; resultHasSuffix = true; }
				const game = {
					matchDay: matchDay.no,
					datetime: isoDatetime, date: isoDate, time: `${timeSplit[0]}:${timeSplit[1]}`,
					team1: col(matchColMap.team1), team2: col(matchColMap.team2),
					result: cleanResult.includes('_:_') ? '' : cleanResult,
					resultHasSuffix
				};
				matchDay.games.push(game);
				dateCount[isoDate] = (dateCount[isoDate] || 0) + 1;
				if (game.team1 === team.name || game.team2 === team.name) {
					matches.push({
						matchDay: game.matchDay, datetime: game.datetime, date: game.date, time: game.time,
						result: game.result, resultHasSuffix: game.resultHasSuffix,
						home: game.team1 === team.name,
						opponent: game.team1 === team.name ? game.team2 : game.team1
					});
				}
			}
		});
		if (matchDay && Object.keys(dateCount).length > 0) {
			const topDate = Object.entries(dateCount).sort((a,b) => b[1] - a[1])[0][0];
			matchDay.date = new Date(topDate + "T00:00");
		}
		matches.sort((a,b) => (a.matchDay > b.matchDay) ? 1 : ((b.matchDay > a.matchDay) ? -1 : 0));
		return { allMatchdays, matches };
	},

	_determineCurrentMatchday: function(allMatchdays) {
		if (!allMatchdays || allMatchdays.length === 0) return null;
		let currentMatchDay = null;
		let mostRecentPastDate = null;
		const today = stfvData.getCurrentDate();
		today.setHours(0, 0, 0, 0);
		allMatchdays.forEach((md, index) => {
			if (md.date && md.date <= today && (!mostRecentPastDate || md.date > mostRecentPastDate)) {
				mostRecentPastDate = md.date;
				currentMatchDay = md;
				currentMatchDay.index = index;
			}
		});
		if (currentMatchDay == null) {
			currentMatchDay = allMatchdays[0];
			currentMatchDay.index = 0;
		}
		return currentMatchDay;
	},

	async fetchBegegnungenFromStfv(url) {
		const response = await stfvData.fetchFromStfv(url);
		const div = document.createElement('div');
		div.innerHTML = response;
		return div;
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
		const map = { datetime: 0, team1: 1, team2: 2, result: null };
		$('tr.sectiontableheader', matchTables).each(function() {
			if ($(this).find('th').length < 3) return; // skip single-th matchday headers
			$(this).find('th').each(function(i) {
				const text = $(this).text().replace(/\s+/g, ' ').trim().toLowerCase();
				if (text.includes('zeitpunkt')) map.datetime = i;
				else if (text === 'heim') map.team1 = i;
				else if (text === 'gast') map.team2 = i;
				else if (text.includes('ergebnis') || text.includes('sätze')) map.result = i;
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

				let rawResult = $(this).find('td').last().text().replace(/\s+/g, ' ').trim();
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

	getClassicLandesligaStatsUrl() {
		return 'https://stfv.de/teamsport/spielerstatistiken?task=spielerstatistik&id=13';
	},

	async fetchClassicLandesligaStats() {
		const response = await stfvData.fetchFromStfv(stfvData.getClassicLandesligaStatsUrl());
		const div = document.createElement('div');
		div.innerHTML = response;
		return div;
	},

	extractPlayerStats(statsHtml, teamName) {
		const map = new Map();
		const $table = $(statsHtml).find('table').filter(function () {
			return $(this).find('tr.sectiontableheader').length > 0;
		}).first();

		// Build column index map from header names
		const colIdx = {};
		$table.find('tr.sectiontableheader th').each(function (i) {
			const key = $(this).text().replace(/\s+/g, ' ').trim().toLowerCase();
			colIdx[key] = i;
		});
		const spielerIdx = colIdx['spieler'];
		const pPlusIdx   = colIdx['p +'];
		const spieleIdx  = colIdx['spiele'];
		if (spielerIdx == null || pPlusIdx == null || spieleIdx == null) return map;

		$table.find('tr.sectiontableentry1, tr.sectiontableentry2').each(function () {
			const tds = $(this).find('td');
			const spieler = tds.eq(spielerIdx).text().replace(/\s+/g, ' ').trim();
			if (!spieler.includes(teamName)) return;
			const name = spieler.replace(teamName, '').trim();
			const pPlus  = parseInt(tds.eq(pPlusIdx).text().trim());
			const spiele = parseInt(tds.eq(spieleIdx).text().trim());
			if (!isNaN(pPlus) && !isNaN(spiele) && spiele > 0) {
				map.set(name, Math.round((pPlus / spiele) * 2 * 100) / 100);
			}
		});
		return map;
	},

	async collectPlayerStats(teamName) {
		const html = await stfvData.fetchClassicLandesligaStats();
		return stfvData.extractPlayerStats(html, teamName);
	},

	extractCupData: function (team, stfvCupHtml) {
		// Cup matches (no league table for cup)
		let matches = [];
		let roundName = null;
		const matchColMap = stfvData._buildMatchColMap($('table.contentpaneopen', stfvCupHtml));

		$("table.contentpaneopen tr", stfvCupHtml).each(function() {

			if ($(this).hasClass('sectiontableheader')) {
				// Extract the round name (e.g., "1. Runde - Vorrunde")
				roundName = $(this).find('th').text().replace(/\s+/g, ' ').trim();

			} else if ($(this).hasClass('sectiontableentry1') || $(this).hasClass('sectiontableentry2')) {

				// Extract match information
				const col = (i) => $(this).find('td').eq(i).text().replace(/\s+/g, ' ').trim();
				let dateTimeStr = col(matchColMap.datetime);
				let [, date, time] = dateTimeStr.split(' ');

				if (!date || !time) return; // Skip invalid entries

				let dateSplit = date.split(".");
				let timeSplit = time.split(":");

				let isoDate = `${dateSplit[2]}-${dateSplit[1]}-${dateSplit[0]}`;
				let isoDatetime = `${isoDate}T${timeSplit[0]}:${timeSplit[1]}`;

				let team1 = col(matchColMap.team1);
				let team2 = col(matchColMap.team2);
				let result = col(matchColMap.result);

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