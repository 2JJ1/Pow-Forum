(function(window){
	function TimeStamp(){
		var library = {}
		
		//Converts 24 hour time to am or pm
		library.getAMPM = function(date) {
			var hours = date.getHours();
			var minutes = date.getMinutes();
			var ampm = hours >= 12 ? 'PM' : 'AM';
			hours = hours % 12;
			hours = hours ? hours : 12; // the hour '0' should be '12'
			minutes = minutes < 10 ? '0'+minutes : minutes;
			var strTime = hours + ':' + minutes + ' ' + ampm;
			return strTime;
		}

		//Retrieve month from timestamp
		library.getMonth = function(timestamp){
			var months = ["January","February","March","April","May","June","July", "August", "September", "October", "November", "December"];
			return months[timestamp.getMonth()];
		}

		//Retrieve weekday from timestamp
		library.getWeekDay = function(timestamp){
			var days = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
			return days[timestamp.getDay()];
		}

		//Beautifies timestamp
		library.Beautify = function(timestamp) {
			var dateToReturn = "";
			timestamp = new Date(timestamp);

			let currentDate = new Date();
			
			//If older than a year (365 days)
			if((currentDate - timestamp) / (1000*60*60*24*365) > 1){ //If timestamp is older than a year
				dateToReturn += this.getMonth(timestamp) + " " + timestamp.getDate() + ", " + timestamp.getFullYear(); //January 1, 1999
			}
			//If same year
			else{
				//If timestamp older than a week (7 days)
				if((currentDate - timestamp) / (1000*60*60*24*7) > 1){
					dateToReturn += this.getMonth(timestamp) + " " + timestamp.getDate(); //January 1
				}
				//If same week
				else{
					//If older than yesterday
					if((currentDate - timestamp) / (1000*60*60*24*2) > 1){
						dateToReturn += this.getWeekDay(timestamp) + " at " + this.getAMPM(timestamp); //Monday at 12:00 AM
					}
					else{
						//Yesterday
						if((currentDate - timestamp) / (1000*60*60*24*1) > 1){
							dateToReturn += "Yesterday at " + this.getAMPM(timestamp); //Yesterday at 12:00 AM
						}
						//Today
						else{
							//posted today
							dateToReturn += this.getAMPM(timestamp); //12:00 AM
						}
					}
				}
			}

			return dateToReturn;
		}

		//Shortens timestamp : 5 mins ago | Thu 3:26px | Jun 18
		library.Shorten = function(timestamp) {
			var dateToReturn = "";
			timestamp = new Date(timestamp);

			let currentDate = new Date();
			
			//If timestamp is older than a year
			if(currentDate.getFullYear() > timestamp.getFullYear()){
				dateToReturn += this.getMonth(timestamp).substr(0,3) + " " + timestamp.getDate() + ", " + timestamp.getFullYear(); //Jan 1, 1999
			}
			//If is same year
			else{ 
				//If older than 7 days
				if((currentDate.getMonth() > timestamp.getMonth()) || (currentDate.getDate() > timestamp.getDate() + 6)){ 
					dateToReturn += this.getMonth(timestamp).substr(0,3) + " " + timestamp.getDate(); //Jan 1
				}
				//If in past 7 days
				else{ 
					//If timestamp older than today
					if(currentDate.getDate() > timestamp.getDate()){
						dateToReturn += this.getWeekDay(timestamp).substr(0,3) // "Mon" for Monday
					}
					//If timestamp is today
					else{
						dateToReturn += this.getAMPM(timestamp); //12:00 AM
					}
				}
			}

			return dateToReturn;
		}
		
		return library;
	} 

	if(typeof(window.TimeStamp) === 'undefined'){
		window.TimeStamp = TimeStamp();
	}
})(window)