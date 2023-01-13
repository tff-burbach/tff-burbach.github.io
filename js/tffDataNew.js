/**
 * TFF Burbach data access
 */

async function readTFFData() {
  var body = {
    teams: [],
    locations: []
  }

  initializeTeams(body);
  var proms = [];
  body.teams.forEach(team => {
    proms.push(stfvData.collectLeagueData(team, 2019));
  })
  return Promise.all(proms)
    .then(results => {
      var i = 0;
      results.forEach(result => {
        body.teams[i] = {...body.teams[i], ...result};
        // body.teams[i].currentMatchDay = result.currentMatchDay;
        // body.teams[i].matchDays = result.matchDays
        i++;
      })
      return stfvData.getLocations();
    })
    .then(result => {
      body.locations = result;
      return body;
    })
};

function initializeTeams(body) {
  var team1 = {
    name: "TFC Burbach 1",
    league: "Landesliga"
  };
  body.teams.push(team1);
};

// function readMatchdays(team, body) {
//   return stfvData.getMatchDays(team.league)
//     .then(results => {
//       var i = 0;
//       results.forEach(result => {
//         body.teams[i].matchdays = result.matchdays;
//         i++;
//       })
//     })
// };

// function readGames(body) {
// };

// function readTables(body) {
//   return stfvData.getCurrentLeagueData(body.teams[0].league)
//     .then(result => {
//       body.tables.team1 = result;
//       return body;
//     })
// };
