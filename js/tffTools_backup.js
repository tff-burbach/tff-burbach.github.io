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

	generateNews() {
		var newsParent = jQuery('#news');
		var newsTemplate = newsParent.find('#newsEntryTemplate');
		newsTemplate.remove();
		var count = 0;
		for ( var i = 0; i < tffData.infos.length; i++) {
			var info = tffData.infos[i];
			if (info === undefined) break; // ie hack
			if (info.hide !== undefined) break; // ie hack
			var newsEntry = newsTemplate.clone();
			newsEntry.id = 'newsEntry' + count++;
			newsEntry.css('display', 'block');
			newsEntry.html(info.titel);
			tffTools._addLink(newsEntry, info.link);
			newsParent.append(newsEntry);
		}
		var requestedSchedules = tffTools._getSchedules(1, 2, undefined, 2, 3);
		for ( var i = 0; i < requestedSchedules.length; i++) {
			var termin = requestedSchedules[i];
			if (termin === undefined) break; // ie hack
			var newsEntry = newsTemplate.clone();
			newsEntry.id = 'newsEntry' + count++;
			newsEntry.css('display', 'block');
			if (termin.isPast) {
				newsEntry.css('color', 'rgb(173, 154, 85)');
			}
			tffTools._generateScheduleTitle(newsEntry, termin, true);
			newsParent.append(newsEntry);
		}
	},

	showCountdown(noOfEntries, size, types) {
		var countdownParent = jQuery('#contentCountdown');
		var termine = tffTools._getNextSchedules(2, noOfEntries, types);
		if (!termine || !termine[0]) return;
		var dt = tffTools._getDateTimeArray(termine[0]);
		var nextDate = tffTools._getDateFromSchedule(termine[0]);
		var today = new Date();
		var diffTimeMSec = nextDate.getTime() - today.getTime();
		var showMonth = ( (nextDate.getMonth()-today.getMonth()) > 0 && (nextDate.getDate()-today.getDate()) >= 0);
		var showDay = diffTimeMSec / (1000 * 60 * 60) > 24;
		var rangeHi = ( showMonth ? "month" : "day");
		rangeHi = ( !showMonth && showDay ? rangeHi : "hour");
		var width = ( showMonth ? size * 5 : size * 4);
		width = ( !showMonth && showDay ? width : size * 3);
		var myCountdownTest3 = new Countdown({
									year    : nextDate.getFullYear(),
									month   : nextDate.getMonth() + 1,
									day     : nextDate.getDate(),
									hour    : nextDate.getHours(),
									minute  : nextDate.getMinutes(),
									width	: width, 
									height	: size * .8,
									rangeHi : rangeHi,
									style   : "flip",
									target  : "countdown",
									inline  : true,
									onComplete	: tffTools.refreshPage,
									labels	: 	{
													font 	: "Arial",
													color	: "#AAAAAA",
													weight	: "normal"
												}
									});
		var countdownTitle = countdownParent.find('#countdownTitle');
		tffTools._generateScheduleTitle(countdownTitle, termine[0], true, true);
		if (termine[1] !== undefined) {
			var countdownTitle2 = countdownParent.find('#countdownTitle2');
			tffTools._generateScheduleTitle(countdownTitle2, termine[1], true, true);
		}
		tffTools.setAddresses();
	},

	showInfos(animate) {
	    animate = (animate === undefined ? false : animate);
		var scheduleParent = jQuery('#contentInfos');
		var scheduleTemplate = scheduleParent.find('#contentEntryTemplate');
		var fadeTimeTmp = tffTools.fadeTime;
		for ( var i = 0; i < tffData.infos.length; i++) {
			var info = tffData.infos[i];
			if (info === undefined) break; // ie hack
			var scheduleEntry = scheduleTemplate.clone();
			scheduleEntry.id = 'contentEntry' + i;
			scheduleEntry.css('display', 'block');
			var scheduleEntryContentTitle = scheduleEntry.find('#contenttitle');
			scheduleEntryContentTitle.html(info.titel);
			tffTools._addLink(scheduleEntryContentTitle, info.link);
			if (animate) {
				scheduleEntry.fadeIn(fadeTimeTmp);
				fadeTimeTmp += tffTools.fadeTimeIncrement;
			}
			scheduleParent.append(scheduleEntry);
		}
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
	
	setHeaderImage() {
		var imgHeaderLeft = jQuery('#leftHeaderImage');
		var imgHeaderRight = jQuery('#rightHeaderImage');
		if (!imgHeaderLeft || !imgHeaderRight) return;
		var today = tffTools._getNewDate();
		var year = today.getFullYear();
		var imgSrc;
		// Halloween
		var fromDate = new Date(year + '-10-16T00:00');
		var toDate = new Date(year + '-11-01T23:59');
		if (today > fromDate && today < toDate) {
			imgSrc = 'halloween';
		}
		// Christmas
		fromDate = new Date(year + '-11-27T00:00');
		toDate = new Date(year + '-12-26T23:59');
		if (today > fromDate && today < toDate) {
			imgSrc = 'christmas';
		}
		// Sylvester
		fromDate = new Date(year + '-12-27T00:00');
		toDate = new Date(year + '-12-31T23:59');
		if (today > fromDate && today < toDate) {
			imgSrc = 'sylvester';
		}
		// New Year
		fromDate = new Date(year + '-01-01T00:00');
		toDate = new Date(year + '-01-03T23:59');
		if (today > fromDate && today < toDate) {
			imgSrc = 'newyear';
		}
		// Carnival
		fromDate = tffTools._getCarnivalDate(today.getFullYear());
		fromDate.setDate(fromDate.getDate() - 7);
		toDate = tffTools._getCarnivalDate(today.getFullYear());
		toDate.setDate(toDate.getDate() + 2);
		if (today > fromDate && today < toDate) {
			imgSrc = 'carnival';
		}
		// Easter
		fromDate = tffTools._getEasterDate(today.getFullYear());
		fromDate.setDate(fromDate.getDate() - 7);
		toDate = tffTools._getEasterDate(today.getFullYear());
		toDate.setDate(toDate.getDate() + 2);
		if (today > fromDate && today < toDate) {
			imgSrc = 'easter';
		}
		if (imgSrc) {
			imgHeaderLeft.attr('src', imgHeaderLeft.attr('src').substring(0,imgHeaderLeft.attr('src').lastIndexOf('/')+1)+imgSrc+'.gif');
			imgHeaderRight.attr('src', imgHeaderRight.attr('src').substring(0,imgHeaderRight.attr('src').lastIndexOf('/')+1)+imgSrc+'.gif');
		}
		else {
			setTimeout(tffTools.rotateHeaderImage, tffTools.rotateWaitingTime);
		}
	},
	
	rotateHeaderImage() {
		var leftHeaderImage = jQuery('#leftHeaderImage');
		var rightHeaderImage = jQuery('#rightHeaderImage');
		tffTools.rotateDegree = tffTools.rotateDegree + tffTools.rotateDegreeIncrement;
		tffTools._rotateImage(leftHeaderImage, tffTools.rotateDegree);
		tffTools._rotateImage(rightHeaderImage, tffTools.rotateDegree);
		if (tffTools.rotateDegree % 360 === 0) {
			tffTools.rotateDegree = 0;
			tffTools._rotateImage(leftHeaderImage, tffTools.rotateDegree);
			tffTools._rotateImage(rightHeaderImage, tffTools.rotateDegree);
			setTimeout(tffTools.rotateHeaderImage, tffTools.rotateWaitingTime);
		}
		else {
			setTimeout(tffTools.rotateHeaderImage, tffTools.rotateDelay);
		}
	},

	refreshPage() {
		location.reload(false);
	},

	_rotateImage(image, degree) {
		var rotateValue = 'rotate(' + degree + 'deg)';
		image.css('transform', rotateValue);
		image.css('WebkitTransform', rotateValue);
		image.css('MozTransform', rotateValue);
		image.css('OTransform', rotateValue);
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
				scheduleTitle.html(scheduleTitle.html() + ' - <strong>' + termin.spiel_ergebnis + '</strong>');
			}
			else {
				if (termin.isPast && (termin.typ.startsWith('L') || termin.typ.startsWith('P') || termin.typ.startsWith('C')) ) {
					console.log("result missing - request result from stfv");
					var result = stfvAccess.getCurrentResult(tffTools._setScheduleResult, scheduleTitle, termin);
				}
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
		tffData.leagueData = await stfvData.collectLeagueData(tffData.team1, tffTools._getNewDate().getFullYear());
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
		var today = tffTools._getNewDate();
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
		var today = tffTools._getNewDate();
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
	
	_getCarnivalDate(year) {
		var carnivalDate = tffTools._getEasterDate(year);
		carnivalDate.setDate(carnivalDate.getDate() - 48);
		return carnivalDate;
	},

	_getEasterDate(year) {
		var a = year % 19;
		var b = Math.floor(year / 100);
		var c = year % 100;
		var d = Math.floor(b / 4); 
		var e = b % 4;
		var f = Math.floor((b + 8) / 25);
		var g = Math.floor((b - f + 1) / 3); 
		var h = (19 * a + b - d - g + 15) % 30;
		var i = Math.floor(c / 4);
		var k = c % 4;
		var l = (32 + 2 * e + 2 * i - h - k) % 7;
		var m = Math.floor((a + 11 * h + 22 * l) / 451);
		var n0 = (h + l + 7 * m + 114)
		var n = Math.floor(n0 / 31) - 1;
		var p = n0 % 31 + 1;
		var date = new Date(year,n,p);
		return date; 
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
								addresse = $stfvaddressLink.html().replace(/<br>/g,", ");
								addressText = pub + ": " + $stfvaddressLink.text();
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

	async showTable() {
		await tffTools._initializeData();
		const teamname = tffData.team1.name;
		const $contentTable = $('#contentTable');
		var matchDay = tffData.leagueData.currentMatchDay;
		tffTools._buildMatchdayGames($contentTable.find('#currentMatchDayGames'), teamname, matchDay);
		tffTools._buildMatchdayTable($contentTable.find('#currentMatchDayTable'), teamname, matchDay);
		const nextIndex = tffData.leagueData.matchDays.findIndex(entry => entry.no === matchDay.no) + 1;
		const nextMatchDay = tffData.leagueData.matchDays[nextIndex];
		if (nextMatchDay) {
			tffTools._buildMatchdayGames($contentTable.find('#nextMatchDayGames'), teamname, nextMatchDay);
		}
		$contentTable.find('#status').addClass('d-none');
	},

	_buildMatchdayGames($matchdayGames, teamname, matchday, games) {
		games = !games ? matchday.games : games;
		var loaded = false;
		$matchdayGames.find('#gamesTitle').text(matchday.text);
		$matchdayGames.attr('spieltag', matchday.no);
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

	_buildMatchdayTable($matchdayTable, teamname, matchday, table) {
		table = !table ? matchday.table : table;
		var loaded = false;
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

	_getNewDate() {
		return new Date();
		// return new Date('2019-04-19T19:59');
	}

}