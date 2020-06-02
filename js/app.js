(function() {
	var bulbs = [{isOn: false}, {isOn: false}, {isOn: false}];
	var groups;
    var timerUpdateDate = 0,
        flagConsole = false,
        flagDigital = false,
        battery = navigator.battery || navigator.webkitBattery || navigator.mozBattery,
        interval,
        arrDay = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
        arrMonth = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    /**
     * Updates the date and sets refresh callback on the next day.
     * @private
     * @param {number} prevDay - date of the previous day
     */
    function updateDate(prevDay) {
        var datetime = tizen.time.getCurrentDateTime(),
            nextInterval,
            strDay = document.getElementById("str-date-time"),
            strFullDate,
            getDay = datetime.getDay(),
            getDate = datetime.getDate(),
            getMonth = datetime.getMonth();

        // Check the update condition.
        // if prevDate is '0', it will always update the date.
        if (prevDay !== null) {
            if (prevDay === getDay) {
                /**
                 * If the date was not changed (meaning that something went wrong),
                 * call updateDate again after a second.
                 */
                nextInterval = 1000;
            } else {
                /**
                 * If the day was changed,
                 * call updateDate at the beginning of the next day.
                 */
                // Calculate how much time is left until the next day.
                nextInterval =
                    (23 - datetime.getHours()) * 60 * 60 * 1000 +
                    (59 - datetime.getMinutes()) * 60 * 1000 +
                    (59 - datetime.getSeconds()) * 1000 +
                    (1000 - datetime.getMilliseconds()) +
                    1;
            }
        }

        if (getDate < 10) {
            getDate = "0" + getDate;
        }

        strFullDate = arrDay[getDay] + ", " + getDate + " " + arrMonth[getMonth];
        strDay.innerHTML = strFullDate;

        // If an updateDate timer already exists, clear the previous timer.
        if (timerUpdateDate) {
            clearTimeout(timerUpdateDate);
        }

        // Set next timeout for date update.
        timerUpdateDate = setTimeout(function() {
            updateDate(getDay);
        }, nextInterval);
    }

    /**
     * Updates the current time.
     * @private
     */
    function updateTime() {
        var strHours = document.getElementById("str-hours"),
            strConsole = document.getElementById("str-console"),
            strMinutes = document.getElementById("str-minutes"),
            datetime = tizen.time.getCurrentDateTime(),
            hour = datetime.getHours(),
            minute = datetime.getMinutes();

        strHours.innerHTML = hour;
        strMinutes.innerHTML = minute;

        if (minute < 10) {
            strMinutes.innerHTML = "0" + minute;
        }
        if (hour < 10) {
        		strHours.innerHTML = "0" + hour;
        }

        if (flagDigital) {
            strConsole.style.visibility = flagConsole ? "visible" : "hidden";
            flagConsole = !flagConsole;
        } else {
            strConsole.style.visibility = "visible";
            flagConsole = false;
        }
    }

    /**
     * Starts timer for normal digital watch mode.
     * @private
     */
    function initDigitalWatch() {
        flagDigital = true;
        interval = setInterval(updateTime, 500);
    }

    /**
     * Clears timer and sets background image as none for ambient digital watch mode.
     * @private
     */
    function ambientDigitalWatch() {
        flagDigital = false;
        clearInterval(interval);
        updateTime();
    }

    /**
     * Gets battery state.
     * Updates battery level.
     * @private
     */
    function getBatteryState() {
		var batteryLevel = Math.floor(battery.level * 100);
		document.getElementById("str-battery-status").innerHTML = batteryLevel + "%";
    }

    /**
     * Updates watch screen. (time and date)
     * @private
     */
    function updateWatch() {
        updateTime();
        updateDate(0);
    }

    /**
     * Binds events.
     * @private
     */
    function bindEvents() {
        // add eventListener for battery state
        battery.addEventListener("chargingchange", getBatteryState);
        battery.addEventListener("chargingtimechange", getBatteryState);
        battery.addEventListener("dischargingtimechange", getBatteryState);
        battery.addEventListener("levelchange", getBatteryState);

        // add eventListener for timetick
        window.addEventListener("timetick", function() {
            ambientDigitalWatch();
        });

        // add eventListener for ambientmodechanged
        window.addEventListener("ambientmodechanged", function(e) {
            if (e.detail.ambientMode === true) {
                // rendering ambient mode case
                ambientDigitalWatch();

            } else {
                // rendering normal digital mode case
                initDigitalWatch();
            }
        });

        // add eventListener to update the screen immediately when the device wakes up.
        document.addEventListener("visibilitychange", function() {
            if (!document.hidden) {
                updateWatch();
                getBulbsInfo();
            }
        });

        // add event listeners to update watch screen when the time zone is changed.
        tizen.time.setTimezoneChangeListener(function() {
            updateWatch();
        });
    }

    /**
     * Initializes date and time.
     * Sets to digital mode.
     * @private
     */
    function init() {
		bindClickEventsToBulbs();
		getBulbsInfo();
		updateBulbsStatus();
	    	
        initDigitalWatch();
        updateDate(0);

        bindEvents();
    }
    
    function getBulbsInfo() {
    		var client = new XMLHttpRequest();
		client.onerror = onerrorhandler;
		client.onreadystatechange = onGetGroupsSuccess;
		client.open("GET", "http://192.168.0.80:4000/groups", false);
		client.send();
    }
    
    
    /**
     * Binds click event on each bulb
     * 
     * Don't refactor this method. Selecting multiples nodes must look like this.
     * https://docs.tizen.org/application/web/guides/w3c/ui/selector/
     * 
     * @private
     */
    function bindClickEventsToBulbs() {
    		var bulbsContainer = document.querySelector('#bulbs');
		var uiBulbs = bulbsContainer.querySelectorAll('.bulb');
		var i = bulbs.length;
		while (0 < i) {
		    i--;
		    uiBulbs[i].addEventListener('click', function (uiBulb) {
		    		var index = uiBulb.currentTarget.getAttribute('index');
		    		var groupId = Object.keys(groups)[index];
		    		toggleGroup(groupId, index);
			});
		}
    }
    
    function toggleGroup(groupId, index) {
		var client = new XMLHttpRequest();
		client.onerror = onerrorhandler;
		client.onloadend = function () {
			if(this.readyState == this.DONE && this.status == 200 && JSON.parse(this.responseText).toggled) {
				bulbs[index].onOff = !bulbs[index].onOff
				updateBulbsStatus();
			}
		};
		client.open("POST", "http://192.168.0.80:4000/groups/" + groupId + "/toggle", false);
		client.send();
	}
    
    /**
     * Iterates over all bulbs and updates status on UI
     * 
     * Don't refactor this method. Selecting multiples nodes must look like this.
     * https://docs.tizen.org/application/web/guides/w3c/ui/selector/
     * 
     * @private
     */
    function updateBulbsStatus() {
    		var bulbsContainer = document.querySelector('#bulbs');
    		var uiBulbs = bulbsContainer.querySelectorAll('.bulb');
    		var i = bulbs.length;
    		while (0 < i) {
    		    i--;
    		    uiBulbs[i].querySelector('#bulb-off').style.display = bulbs[i].onOff ? 'none' : 'initial';
    		    uiBulbs[i].querySelector('#bulb-on').style.display = bulbs[i].onOff ? 'initial' : 'none';
    		    uiBulbs[i].querySelector('#bulb-name').innerHTML = bulbs[i].name;
    		}
    }
    
    function onerrorhandler(e) {
    }   

    function onGetGroupsSuccess() {
      if(this.readyState == this.DONE) {
        if(this.status == 200) {
        		groups = JSON.parse(this.responseText);
        		var keys = Object.keys(groups);
        		bulbs = [];
        		keys.forEach( function(key) {
        			bulbs.push(groups[key].group);
    			});
        		updateBulbsStatus();
        }
      }
    }

    window.onload = init();
}());
