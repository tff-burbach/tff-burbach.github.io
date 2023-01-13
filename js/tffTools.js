tffTools = {

	x_csrf_token : '',
	schedules4Update : [],
	updateScheduled : false,
	collectionTimeMsec : 3 * 1000,

	fadeTime : 500,
	fadeTimeIncrement : 500,
	rotateDegree : 0,
	rotateDegreeIncrement : 1,
	rotateDelay : 20,
	rotateWaitingTime : 5000,

	months : [
		'JAN', 'FEB', 'MÄR', 'APR', 'MAI', 'JUN', 'JUL', 'AUG', 'SEP', 'OKT', 'NOV', 'DEZ'
	],

	days : [
		'So.', 'Mo.', 'Di.', 'Mi.', 'Do.', 'Fr.', 'Sa.'
	],

	async showTFFData() {
		await tffTools._initializeData();
		await tffTools.showSchedules(3,10,true,true);
		await tffTools.showTable();
		// var scrollSpy = new bootstrap.ScrollSpy(document.body, {
		// 	target: '#navbar-scrolling',
		// 	method: 'auto'
		// })
		// var dataSpyList = [].slice.call(document.querySelectorAll('[data-bs-spy="scroll"]'))
		// dataSpyList.forEach(function (dataSpyEl) {
		// 	bootstrap.ScrollSpy.getInstance(dataSpyEl)
		// 		.refresh()
		// })
	},

	async showSchedules(noPast, noFuture, animate, onlyImportant, types) {
		var scheduleParent = jQuery('#contentSchedules');
		if (onlyImportant) {
			tffTools._showSchedules(scheduleParent, await tffTools._getSchedules(noPast, noFuture, types, 1, 2), animate);
		}
		else {
			tffTools._showSchedules(scheduleParent, await tffTools._getSchedules(noPast, noFuture, types), animate);
		}
	},
	
	async showSchedulesByType(contentSchedulesId, type) {
		var animate;
		var scheduleParent = jQuery(contentSchedulesId);
			tffTools._showSchedules(scheduleParent, tffTools._getSchedules(undefined,undefined,Array.from(type)), animate);
	},
	
	refreshPage() {
		location.reload(false);
	},

	async _showSchedules(scheduleParent, requestedSchedules, animate) {
	    animate = (animate === undefined ? false : animate);
		var scheduleTemplate = scheduleParent.find('#contentEntryTemplate');
		var fadeTimeTmp = tffTools.fadeTime;
		for ( var i = 0; i < requestedSchedules.length; i++) {
			var termin = requestedSchedules[i];
			if (termin === undefined) break; // ie hack
			var date = new Date(termin.datum);
			var scheduleEntry = scheduleTemplate.clone();
			scheduleEntry.id = 'contentEntry' + i;
			scheduleEntry.css('display', '');
			if (termin.isPast) {
				scheduleEntry.addClass('contentinactive');
			}
			var scheduleEntryContentDate = scheduleEntry.find('#contentdate');
			if (termin.isPast) {
				scheduleEntryContentDate.addClass('contentdateinactive');
			}
			if (termin.isCurrent) {
				scheduleEntryContentDate.addClass('contentdatecurrent');
			}
			var month = scheduleEntryContentDate.find('#month');
			month.html(tffTools.months[date.getMonth()]);
			var day = scheduleEntryContentDate.find('#day');
			day.html(date.getDate() +  '.');
			var scheduleEntryContent = scheduleEntry.find('#content');
			tffTools._generateScheduleTitle(scheduleEntryContent, termin, false, true);
			if (animate) {
				scheduleEntry.fadeIn(fadeTimeTmp);
				fadeTimeTmp += tffTools.fadeTimeIncrement;
			}
			scheduleParent.append(scheduleEntry);
		}
		tffTools.setAddresses();
	},
	
	_generateScheduleTitle(scheduleContent, termin, showDate, addAddress) {
			var scheduleTitle = scheduleContent.find('#contenttitle');
			if (termin.isCurrent) {
				scheduleTitle.addClass('contentcurrent');
			}
			if (termin.isPast) {
				scheduleTitle.addClass('contentinactive');
			}
			var date = new Date(termin.datetime);
			scheduleTitle.html(tffTools.days[date.getDay()]);
			if (showDate) {
				scheduleTitle.html(scheduleTitle.html() + ' ' + date.getDate() + '.' + (date.getMonth() + 1) + '.');
			}
			if (termin.zeit) {
				scheduleTitle.html(scheduleTitle.html() + ' ' + termin.zeit + '');
			}
			scheduleTitle.html(scheduleTitle.html() + " - ");
			scheduleTitle.html(scheduleTitle.html() + tffData.getTypeAsString(termin.typ));
			if (termin.titel !== undefined) {
				scheduleTitle.html(scheduleTitle.html() + ' ' + termin.titel);
			}
			if (termin.spieltag !== undefined && termin.spieltag !== '') {
				scheduleTitle.html(scheduleTitle.html() + ', ' + termin.spieltag + '. ' + tffData.spieltag);
			}
			if (termin.gegner !== undefined && termin.gegner !== '') {
				scheduleTitle.html(scheduleTitle.html() + ': ' + termin.gegner);
			}
			if ((termin.ort == 'H' || termin.ort == 'A') || 
				(!addAddress && termin.ort !== undefined && termin.ort !== '')    ) {
				scheduleTitle.html(scheduleTitle.html() + ' (' + termin.ort + ')');
			}
			if (termin.spiel_ergebnis !== undefined && termin.spiel_ergebnis !== '') {
				scheduleTitle.html(scheduleTitle.html() + ' - ' + termin.spiel_ergebnis + '');
			}
			scheduleTitle.addClass('xxxtooltip');
			scheduleTitle.attr('data-termin', JSON.stringify(termin));
			scheduleTitle[0].style.display="";
			tffTools._addLink(scheduleTitle, termin.link);
			// if (addAddress) {
				// scheduleTitle.html(scheduleTitle.html() + '<div class=\"contentaddress\">Ort: -</div>');
			// }
			// else {
			// 	scheduleTitle.html(scheduleTitle.html() + '<br><a id=\"address\" class=\"tooltiptext\" target="_blank" href=\"' + termin.adress_url + '\">' + termin.adresse + '</a>');
			// }
	},

	_addLink(content, link) {
		if (link) {
			var linkTargets = link.split(';');
			var innerLinks = content.html().match(/{[^}]*}/g);
			if (innerLinks) {
				for ( var i = 0; i < innerLinks.length; i++) {
					var internalLink = false;
					if (innerLinks[i] === undefined) break; // ie hack
					var linkContent = innerLinks[i].replace('{','');
					linkContent = linkContent.replace('}','');
					if (linkTargets[i].length >= 1) {
						if (linkTargets[i].substring(0,4) !== 'http') {
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
					content.html(content.html().replace(innerLinks[i], linkString));
				}
			}
			else {
				content.html(content.html() + " - ");
				var a = document.createElement('a');
				var internalLink = false;
				if (link.substring(0,4) !== 'http') {
					link = tffTools._getIndexUrl() + '/' + link;
					internalLink = true;
				}
				a.href = link;
				a.innerHTML = 'Hier!';
				if (!internalLink) {
					a.target = '_blank';
				}
				content.append(a);
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
		tffData.leagueData = await stfvData.collectLeagueData(tffData.team1);
		tffData.leagueData.matches.forEach(match => {
			tffData.termine.push({
				datetime: match.datetime,
				datum: match.date,
				zeit: match.time,
				typ: tffData.typL,
				gegner: match.opponent,
				ort: match.home ? 'H' : 'A',
				spiel_ergebnis: match.result
			})
		});
		tffData.termine.sort((a, b) => (a.datetime > b.datetime) ? 1 : -1);
	},
	
	_initializeSchedules(scheduleParent, fromDate, toDate) {
		var today = tffTools.getCurrentDate();
		var checkCurrent = true;
		var currentDate;
		for ( var i = 0; i < tffData.termine.length; i++) {
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
	
	async _getSchedules(noPast, noFuture, types, minImportance, minPastImportance) {
		await tffTools._initializeData();
		var today = tffTools.getCurrentDate();
		var checkCurrent = true;
		var pastCount = 0;
		var futureCount = 0;
		var requestedSchedules = [];
		for ( var i = 0; i < tffData.termine.length; i++) {
			var termin = tffData.termine[i];
			if (termin === undefined) break; // ie hack
			if (minImportance) {
				if (!minPastImportance) minPastImportance = minImportance;
				if (termin.wichtigkeit < minImportance || (termin.isPast && termin.wichtigkeit < minPastImportance) ) continue;
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
	
	_getDateTimeArray(termin) {
		var d = termin.datum.split("-");
		d[1] = d[1]-1;
		var t;
		if (termin.uhrzeit) {
			t = termin.uhrzeit.split(":");
		}
		else {
			t = ["00","00"];
		}
		return {d:d,t:t}; 
	},

	_getDateFromSchedule(termin) {
		var dt = tffTools._getDateTimeArray(termin);
		var d = dt.d;
		var t = dt.t;
		var date = new Date(d[0], d[1], d[2], t[0], t[1]);
		return date;
	},

	_getNextSchedules(minImportance, noOfEntries, types) {
		tffTools._initializeData();
		var addNext = false;
		var entryCounter = 0;
		noOfEntries = (noOfEntries === undefined ? 1 : noOfEntries);
		var nextSchedules = [];
		for ( var i = 0; i < tffData.termine.length; i++) {
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
	
	async setAddresses() {
		const url = "/stfv/vereinsinfos.html";
		const data = await $.get(url);
		$(".content").each(function(index) {
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
						$(data).find("tr").each(function(index) {
							var $trTag = $(this);
							var currentTeam = $trTag.children().eq(0).text().trim();
							if (gegner == currentTeam) {
								var pub = $trTag.children().eq(1).text();
								var $adressTD = $trTag.children().eq(2);
								$stfvaddressLink = $adressTD.children().eq(0);
								addressLink = $stfvaddressLink.attr('href');
								addressText = pub + ": " + $stfvaddressLink.html().replace(/<br>/g,", ");
								console.log($stfvaddressLink.text());
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
						$addressLink.attr('href',addressLink);
						$addressLink.show();
						$addressTag.show();
						$addressLabel.css('');
					}
					else if (addressText != undefined) {
						$addressText.text(addressText);
						$addressText.show();
						$addressTag.show();
						$addressLabel.css('');
					}
					else {
						$addressLabel.css('color','transparent');
						console.log(">>> Team " + gegner + " not found in vereinsinfos.html");
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
						// console.log(">>> Team " + gegner + " not found in vereinsinfos.html");
						// $tag.children('.tooltiptext').remove();
					}
				}
			}
			catch (e) {
				console.log("No termin info available.");
			}
		})
	},

	showGames(index){
		const nextMatchDay = tffData.leagueData.matchDays[nextIndex];
		if (nextMatchDay) {
			tffTools._buildMatchdayGames($contentTable.find('#nextMatchDayGames'), teamname, nextMatchDay, nextIndex);
		}
	},

	async showTable() {
		await tffTools._initializeData();
		const teamname = tffData.team1.name;
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
		$matchdayGames.remove('.gamesRow');
		$matchdayGames.find('#gamesTitle').text(matchday.text);
		$matchdayGames.attr('spieltag', matchday.no);
		$matchdayGames.attr('matchdayIndex', matchdayIndex);
		var index = 1;
		games.forEach(game => {
			$gamesRow = $matchdayGames.find('#gamesRowTemplate').clone();
			var no = game.no ? game.no : index;
			$gamesRow.attr('id', 'gamesRow' + no);
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
		}
	},

	_buildMatchdayTable($matchdayTable, teamname, matchday) {
		table = matchday.table;
		var loaded = false;
		$matchdayTable.remove('.tableRow');
		table.forEach(tableRow => {
			$tableRow = $matchdayTable.find('#tableRowTemplate').clone();
			$tableRow.attr('id', 'tableRow' + tableRow.place);
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

	getCurrentDate() {
		if (tffData.team1.year) {
			return new Date(tffData.team1.year + '-04-19T19:59');
		}
		return new Date();
		// return new Date('2019-04-19T19:59');
	}

}