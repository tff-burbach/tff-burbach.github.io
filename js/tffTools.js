tffTools = {

	x_csrf_token: '',
	schedules4Update: [],
	updateScheduled: false,
	collectionTimeMsec: 3 * 1000,

	fadeTime: 500,
	fadeTimeIncrement: 500,
	rotateDegree: 0,
	rotateDegreeIncrement: 1,
	rotateDelay: 20,
	rotateWaitingTime: 5000,

	months: [
		'JAN', 'FEB', 'MÄR', 'APR', 'MAI', 'JUN', 'JUL', 'AUG', 'SEP', 'OKT', 'NOV', 'DEZ'
	],

	days: [
		'So.', 'Mo.', 'Di.', 'Mi.', 'Do.', 'Fr.', 'Sa.'
	],

	async showTFFData() {
		await tffTools._initializeData();
		await tffTools.showSchedules(3, 10, true, true);
		await tffTools.showTable();
		// var dataSpyList = [].slice.call(document.querySelectorAll('[data-bs-spy="scroll"]'))
		// dataSpyList.forEach(function (dataSpyEl) {
		// 	bootstrap.ScrollSpy.getInstance(dataSpyEl)
		// 		.refresh()
		// })
		// var firstScrollSpyEl = document.querySelector('[data-bs-spy="scroll"]')
		// firstScrollSpyEl.addEventListener('activate.bs.scrollspy', function (event) {
		// 	tffTools._log(`activate.bs.scrollspy: event: ${event}, source: ${event.srcElement}, target: ${event.relatedTarget}`);
		// })
	},

	async showSchedules(noPast, noFuture, animate, onlyImportant, types) {
		var $scheduleParent = jQuery('#contentSchedules');
		if (onlyImportant) {
			tffTools._showSchedules($scheduleParent, await tffTools._getSchedules(noPast, noFuture, types, 1, 2), animate);
		}
		else {
			tffTools._showSchedules($scheduleParent, await tffTools._getSchedules(noPast, noFuture, types), animate);
		}
	},

	async showSchedulesByType(contentSchedulesId, type) {
		var animate;
		var $scheduleParent = jQuery(contentSchedulesId);
		tffTools._showSchedules($scheduleParent, tffTools._getSchedules(undefined, undefined, Array.from(type)), animate);
	},

	refreshPage() {
		location.reload(false);
	},

	async _showSchedules($scheduleParent, requestedSchedules, animate) {
		animate = (animate === undefined ? false : animate);
		var $scheduleTemplate = $scheduleParent.find('#contentEntryTemplate');
		var fadeTimeTmp = tffTools.fadeTime;
		// requestedSchedules.forEach(termin => {
		for (var i = 0; i < requestedSchedules.length; i++) {
			var termin = requestedSchedules[i];
			var date = new Date(termin.datum);
			var $scheduleEntry = $scheduleTemplate.clone();
			$scheduleEntry.attr('id', 'contentEntryGenerated');
			$scheduleEntry.removeClass('d-none');
			if (termin.isPast) {
				$scheduleEntry.addClass('contentinactive');
			}
			var $scheduleEntryContentDate = $scheduleEntry.find('#contentdate');
			if (termin.isPast) {
				$scheduleEntryContentDate.addClass('contentdateinactive');
			}
			if (termin.isCurrent) {
				$scheduleEntryContentDate.addClass('contentdatecurrent');
			}
			var month = $scheduleEntryContentDate.find('#month');
			month.html(tffTools.months[date.getMonth()]);
			var day = $scheduleEntryContentDate.find('#day');
			day.html(date.getDate() + '.');
			var scheduleEntryContent = $scheduleEntry.find('#content');
			tffTools._generateScheduleTitle(scheduleEntryContent, termin, false, true);
			if (animate) {
				$scheduleEntry.fadeIn(fadeTimeTmp);
				fadeTimeTmp += tffTools.fadeTimeIncrement;
			}
			$scheduleParent.append($scheduleEntry);
		}
		// )
		tffTools.setAddresses();
	},

	_generateScheduleTitle($scheduleContent, termin, showDate, addAddress) {
		var $contentTitle = $scheduleContent.find('#contenttitle');
		if (termin.isCurrent) {
			$contentTitle.addClass('contentcurrent');
		}
		if (termin.isPast) {
			$contentTitle.addClass('contentinactive');
		}
		var $contentTitleMain = $contentTitle.find('.contenttitlemain');
		var $contentTitleAddition = $contentTitle.find('.contenttitleaddition');
		var date = new Date(termin.datetime);
		var scheduleTitleMain = tffTools.days[date.getDay()];
		if (showDate) {
			scheduleTitleMain += ' ' + date.getDate() + '.' + (date.getMonth() + 1) + '.';
		}
		if (termin.zeit) {
			scheduleTitleMain += ' ' + termin.zeit + '';
		}
		scheduleTitleMain += " - ";
		scheduleTitleMain += tffData.getTypeAsString(termin.typ);
		if (termin.titel !== undefined) {
			scheduleTitleMain += ' ' + termin.titel;
		}
		if (termin.spieltag !== undefined && termin.spieltag !== '') {
			scheduleTitleMain += ', ' + termin.spieltag + '. ' + tffData.spieltag;
		}
		if (termin.gegner !== undefined && termin.gegner !== '') {
			scheduleTitleMain += ': ' + termin.gegner;
		}
		if ((termin.ort == 'H' || termin.ort == 'A') ||
			(!addAddress && termin.ort !== undefined && termin.ort !== '')) {
			scheduleTitleMain += ' (' + termin.ort + ')';
		}
		var scheduleTitleAddition = '';
		if (termin.ergebnis !== undefined && termin.ergebnis !== '') {
			scheduleTitleAddition = ' - <b>' + termin.ergebnis + '</b>';
		} else if (termin.treff) {
			scheduleTitleAddition = ' - <i>Treff: ' + termin.treff + '</i>';

		}
		$contentTitleMain.html(scheduleTitleMain + scheduleTitleAddition);
		$contentTitleMain.addClass('xxxtooltip');
		$contentTitle.attr('data-termin', JSON.stringify(termin));
		// $contentTitleAddition.text(scheduleTitleAddition);
		tffTools._addLink($contentTitleMain, termin.link);
		// if (addAddress) {
		// scheduleTitle.html(scheduleTitle.html() + '<div class=\"contentaddress\">Ort: -</div>');
		// }
		// else {
		// 	scheduleTitle.html(scheduleTitle.html() + '<br><a id=\"address\" class=\"tooltiptext\" target="_blank" href=\"' + termin.adress_url + '\">' + termin.adresse + '</a>');
		// }
	},

	_addLink($content, link) {
		if (link) {
			var linkTargets = link.split(';');
			var innerLinks = $content.html().match(/{[^}]*}/g);
			if (innerLinks) {
				for (var i = 0; i < innerLinks.length; i++) {
					var internalLink = false;
					if (innerLinks[i] === undefined) break; // ie hack
					var linkContent = innerLinks[i].replace('{', '');
					linkContent = linkContent.replace('}', '');
					if (linkTargets[i].length >= 1) {
						if (linkTargets[i].substring(0, 4) !== 'http') {
							linkTargets[i] = tffTools._getIndexUrl() + '/' + linkTargets[i];
							internalLink = true;
						}
					}
					var linkString;
					if (internalLink) {
						linkString = '<a href="' + linkTargets[i] + '" >' + linkContent + '</a>';
					}
					else {
						linkString = '<a target="_blank" href="' + linkTargets[i] + '" >' + linkContent + '</a>';
					}
					$content.html($content.html().replace(innerLinks[i], linkString));
				}
			}
			else {
				$content.html($content.html() + " - ");
				var a = document.createElement('a');
				var internalLink = false;
				if (link.substring(0, 4) !== 'http') {
					link = tffTools._getIndexUrl() + '/' + link;
					internalLink = true;
				}
				a.href = link;
				a.innerHTML = 'Hier!';
				if (!internalLink) {
					a.target = '_blank';
				}
				$content.append(a);
			}
		}
	},

	async setAddresses() {
		const url = "/stfv/vereinsinfos.html";
		const data = await $.get(url);
		$(".content").each(function (index) {
			var found = false;
			var $tag = $(this);
			var $contentTitle = $tag.find('.contenttitle');
			var $addressTag = $tag.find('.contentaddress');
			var $addressLabel = $tag.find('.contentaddresslabel');
			var $addressLink = $addressTag.find('.contentaddresslink');
			var $addressText = $addressTag.find('.contentaddresstext');
			var addressLink = undefined;
			// var $tooltiptextTag = $tag.children('.tooltiptext').eq(0);
			try {
				var terminAttr = $contentTitle.attr('data-termin');
				if (terminAttr != undefined) {
					var termin = JSON.parse(terminAttr);
					var gegner = termin.gegner;
					var ort = termin.ort;
					var addressText = termin.adresse;
					var addressLink = termin.adress_url;
					if (addressText || addressLink) {
						// do nothing
					}
					else if (ort == 'A') {
						$(data).find("tr").each(function (index) {
							var $trTag = $(this);
							var currentTeam = $trTag.children().eq(0).text().trim();
							if (gegner == currentTeam) {
								var pub = $trTag.children().eq(1).text();
								var $adressTD = $trTag.children().eq(2);
								$stfvaddressLink = $adressTD.children().eq(0);
								addressLink = $stfvaddressLink.attr('href');
								addressText = pub + ": " + $stfvaddressLink.html().replace(/<br>/g, ", ");
								tffTools._log($stfvaddressLink.text());
								return false;
							}
						});
					}
					else if (ort == 'H' || ort == 'Gasthaus Schank') {
						addressText = 'Gasthaus Schank';
						addressLink = 'https://www.google.com/maps/place/In%20den%20Hanfg%C3%A4rten%204,66115%20Saarbr%C3%BCcken';
					}
					else if (ort) {
						addressText = ort;
					}
					// Show address
					if (addressLink) {
						$addressLink.text(addressText);
						$addressLink.attr('href', addressLink);
						$addressLink.removeClass('d-none');
						$addressTag.removeClass('d-none');
					}
					else if (addressText != undefined) {
						$addressText.text(addressText);
						$addressText.removeClass('d-none');
						$addressTag.removeClass('d-none');
					}
					else {
						$addressLabel.css('color', 'transparent');
						tffTools._log(">>> Team " + gegner + " not found in vereinsinfos.html");
					}
					if (found) {
						// $addressTag.show();
						// if ($tooltiptextTag != undefined && $tooltiptextTag.length > 0) {
						// 	$tooltiptextTag.text(addressText);
						// 	if ($addressLink != undefined) {
						// 		$tooltiptextTag.append($addressLink);
						// 	}
						// }
					}
					else {
						// tffTools._log(">>> Team " + gegner + " not found in vereinsinfos.html");
						// $tag.children('.tooltiptext').remove();
					}
				}
			}
			catch (e) {
				tffTools._log("No termin info available.");
			}
		})
	},

	async _getSchedules(noPast, noFuture, types, minImportance, minPastImportance) {
		await tffTools._initializeData();
		var today = tffTools.getCurrentDate();
		var checkCurrent = true;
		var pastCount = 0;
		var futureCount = 0;
		var requestedSchedules = [];
		for (var i = 0; i < tffData.termine.length; i++) {
			var termin = tffData.termine[i];
			if (termin === undefined) break; // ie hack
			if (minImportance) {
				if (!minPastImportance) minPastImportance = minImportance;
				if (termin.wichtigkeit < minImportance || (termin.isPast && termin.wichtigkeit < minPastImportance)) continue;
			}
			if (types !== undefined && types.length > 0 && types.indexOf(termin.typ) < 0) {
				continue;
			}
			if (termin.isPast) {
				pastCount++;
				if (pastCount > noPast) {
					requestedSchedules.shift();
				}
			}
			if (!termin.isPast) {
				futureCount++;
				if (futureCount > noFuture) {
					break;
				}
			}
			requestedSchedules.push(termin);
		}
		return requestedSchedules;
	},

	_getDateFromSchedule(termin) {
		return new Date(termin.datetime);
	},

	_getNextSchedules(minImportance, noOfEntries, types) {
		tffTools._initializeData();
		var addNext = false;
		var entryCounter = 0;
		noOfEntries = (noOfEntries === undefined ? 1 : noOfEntries);
		var nextSchedules = [];
		for (var i = 0; i < tffData.termine.length; i++) {
			var termin = tffData.termine[i];
			if (termin === undefined) break; // ie hack
			if (termin.isCurrent) {
				addNext = true;
			}
			if (addNext && termin.wichtigkeit >= minImportance) {
				if (types == undefined || types.indexOf(termin.typ) > -1) {
					entryCounter++;
					nextSchedules.push(termin);
				}
			}
			if (entryCounter === noOfEntries) {
				break;
			}
		}
		return nextSchedules;
	},

	showPreviousGames() {
		var currentIndex = parseInt($('#nextMatchDayGames').attr('matchdayindex'));
		tffTools._showGames(currentIndex > 0 ? currentIndex - 1 : 0);
	},

	showNextGames() {
		var currentIndex = parseInt($('#nextMatchDayGames').attr('matchdayindex'));
		tffTools._showGames(currentIndex < tffData.leagueData.matchDays.length - 1 ? currentIndex + 1 : tffData.leagueData.matchDays.length);
	},

	_showGames(index) {
		const nextMatchDay = tffData.leagueData.matchDays[index];
		if (nextMatchDay) {
			tffTools._buildMatchdayGames($('#nextMatchDayGames'), tffTools.getTeam().name, nextMatchDay, index);
		}
	},

	async showTable() {
		await tffTools._initializeData();
		const teamname = tffTools.getTeam().name;
		const $contentTable = $('#contentTable');
		var matchDay = tffData.leagueData.currentMatchDay;
		tffTools._buildMatchdayGames($contentTable.find('#currentMatchDayGames'), teamname, matchDay, matchDay.index);
		tffTools._buildMatchdayTable($contentTable.find('#currentMatchDayTable'), teamname, matchDay);
		const nextIndex = tffData.leagueData.matchDays.findIndex(entry => entry.no === matchDay.no) + 1;
		const nextMatchDay = tffData.leagueData.matchDays[nextIndex];
		if (nextMatchDay) {
			tffTools._buildMatchdayGames($contentTable.find('#nextMatchDayGames'), teamname, nextMatchDay, nextIndex);
		}
		$contentTable.find('#status').addClass('d-none');
	},

	_buildMatchdayGames($matchdayGames, teamname, matchday, matchdayIndex) {
		games = matchday.games;
		var loaded = false;
		$matchdayGames.find('#gamesRowGenerated').remove();
		$matchdayGames.find('#gamesTitle').text(matchday.text);
		$matchdayGames.attr('spieltag', matchday.no);
		$matchdayGames.attr('matchdayIndex', matchdayIndex);
		var index = 1;
		games.forEach(game => {
			$gamesRow = $matchdayGames.find('#gamesRowTemplate').clone();
			var no = game.no ? game.no : index;
			$gamesRow.attr('id', 'gamesRowGenerated');
			$gamesRow.find('#no').text(no);
			$gamesRow.find('#team1').text(game.team1);
			$gamesRow.find('#team2').text(game.team2);
			$gamesRow.find('#result').text(game.result ? game.result : ":");
			// Show
			$gamesRow.removeClass('d-none');
			// Highlight
			var highlightTeam;
			highlightTeam = game.team1 === teamname ? '#team1' : highlightTeam
			highlightTeam = game.team2 === teamname ? '#team2' : highlightTeam
			if (highlightTeam) {
				$gamesRow.find('#no').addClass('ownTeam');
				$gamesRow.find(highlightTeam).addClass('ownTeam');
				$gamesRow.find('#result').addClass('ownTeam');
			}
			$matchdayGames.append($gamesRow);
			loaded = true;
			index++;
		})
		if (loaded) {
			$matchdayGames.removeClass('d-none');
			matchdayIndex <= 0 ? $matchdayGames.find('#previousGames').css('color', 'transparent') : $matchdayGames.find('#previousGames').css('color', '');
			matchdayIndex >= tffData.leagueData.matchDays.length - 1 ? $matchdayGames.find('#nextGames').css('color', 'transparent') : $matchdayGames.find('#nextGames').css('color', '');
		}
	},

	_buildMatchdayTable($matchdayTable, teamname, matchday) {
		table = matchday.table;
		var loaded = false;
		$matchdayTable.find('#tableRowGenerated').remove();
		table.forEach(tableRow => {
			$tableRow = $matchdayTable.find('#tableRowTemplate').clone();
			$tableRow.attr('id', 'tableRowGenerated');
			$tableRow.find('#place').text(tableRow.place);
			$tableRow.find('#team').text(tableRow.team);
			$tableRow.find('#goals').text(tableRow.goals);
			$tableRow.find('#sets').text(tableRow.sets);
			$tableRow.find('#score').text(tableRow.scores);
			// Show
			$tableRow.removeClass('d-none');
			// Highlight
			if (tableRow.team === teamname) {
				$tableRow.addClass('ownTeam');
			}
			$matchdayTable.append($tableRow);
			loaded = true;
		})
		if (loaded) {
			$matchdayTable.removeClass('d-none');
		}
	},

	_initializeSchedules(fromDate, toDate) {
		var today = tffTools.getCurrentDate();
		var checkCurrent = true;
		var currentDate;
		for (var i = 0; i < tffData.termine.length; i++) {
			var termin = tffData.termine[i];
			if (termin === undefined) break; // ie hack
			if (termin.wichtigkeit === undefined) {
				termin.wichtigkeit = 3;
			}
			var date = tffTools._getDateFromSchedule(termin);
			if ((date !== undefined) && (date < fromDate || date > toDate)) continue;
			termin.isPast = (date < today);
			if (date > today && checkCurrent) {
				currentDate = date;
				termin.isCurrent = true;
				checkCurrent = false;
			}
			if ((currentDate !== undefined) && !(date < currentDate) && !(date > currentDate)) {
				termin.isCurrent = true;
			}
		}
	},

	async _initializeData() {
		if (tffData.initialized) return;
		await tffTools._initializeTffData();
		tffTools._initializeSchedules();
		tffData.initialized = true;
	},

	async _initializeTffData() {
		tffData.leagueData = await stfvData.collectLeagueData(tffTools.getTeam());
		tffData.leagueData.matches.forEach(match => {
			tffData.termine.push({
				datetime: match.datetime,
				datum: match.date,
				zeit: match.time,
				typ: tffData.typL,
				gegner: match.opponent,
				ort: match.home ? 'H' : 'A',
				ergebnis: match.result
			})
		});
		tffData.termine.sort((a, b) => (a.datetime > b.datetime) ? 1 : -1);
	},

	_log(logMessage) {
		if (false) {
			console.log(logMessage);
		}
	},

	getLeague() {
		return tffData.league;
	},

	getTeam() {
		return { name: 'TFF Burbach', league: 'Landesliga', year: tffTools.getCurrentDate().getFullYear() };
		if (!team.year) {
			team.year = getCurrentDate.getYear();
		}
		return tffData.team;
	},

	getCurrentDate() {
		return new Date();
		// return new Date('2023-02-03T11:01');
		// return new Date('2019-05-01T11:01');
	},

}