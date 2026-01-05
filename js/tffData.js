/**
 * TFF Data Structure
 */
tffData = {

	xxxteam1 : {
    name: "TFF Burbach",
    league: "Landesliga"
  },

	initialized : false,
	typI : 'I',
	typL : 'L',
	typL2 : 'L2',
	typB : 'B',
	typC : 'C',
	typCB : 'CB',
	typKP : 'KP',
	typP : 'P',
	typP2 : 'P2',
	typF : 'F',
	typF2 : 'F2',
	typO : 'O',
	typLString : 'Info',
	typLString : 'Landesliga',
	typL2String : 'Bezirksliga Süd',
	typBString : 'Verbandsliga pro',
	typCString : 'Classic Cup A',
	typCBString : 'Classic Cup B',
	typKPString : 'Kreisligapokal',
	typPString : 'Pokal',
	typP2String : 'Pokal (II.)',
	typFString : 'Freundschaftspiel',
	typF2String : 'Freundschaftspiel (II.)',
	typOString : 'Play-Off',
	spieltag : 'Spieltag',

	einstellungen : {
		teamName : 'TFF Burbach',
		teamName2 : 'TFF Burbach 2',
		teamFarbe : '#f8e18c',
		jahr : '2026',
		ligaName : 'Landesliga',
		ligaNameEncoded : 'Landesliga',
		ligaName2 : 'Bezirksliga Süd',
		ligaNameEncoded2 : 'Bezirksliga+S%FCd',
		ligaNamePro : 'Verbandsliga Pro',
		ligaNameProEncoded : 'Verbandsliga+pro'
	},
	
	infos : [ 
	],
	
	termine : [ 
    ],
	
	getTypeAsString : function(type) {
		if (type === tffData.typI) return '';
		if (type === tffData.typL) return tffData.typLString;
		if (type === tffData.typL2) return tffData.typL2String;
		if (type === tffData.typB) return tffData.typBString;
		if (type === tffData.typC) return tffData.typCString;
		if (type === tffData.typCB) return tffData.typCBString;
		if (type === tffData.typKP) return tffData.typKPString;
		if (type === tffData.typP) return tffData.typPString;
		if (type === tffData.typP2) return tffData.typP2String;
		if (type === tffData.typF) return tffData.typFString;
		if (type === tffData.typF2) return tffData.typF2String;
		if (type === tffData.typO) return tffData.typOString;
		return '';
	},

	leagueData: undefined

}