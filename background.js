let startTime = null;
let ticketTab = null;
let ticketWindow = null;
let ticketId = null;
let currentUserEmail = null;

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  console.log(
    "ON UPDATED ----------------------------------" + changeInfo.status
  );
  console.log("tabId:", tabId);

  if (
    !startTime &&
    tab.url &&
    tab.url.includes("https://app.hubspot.com") &&
    tab.url.includes("8266889")
  ) {
    startTime = Date.now();
    ticketTab = tabId;
    ticketWindow = tab.windowId;
    ticketId = tab.url.match(/ticket\/(\d+)\D*$/)[1];
  }
  if (
    !currentUserEmail &&
    changeInfo.status === "complete" &&
    tab.url &&
    tab.url.includes("https://app.hubspot.com") &&
    tab.url.includes("8266889")
  ) {
    getEmail(tab.id);
  }
  if (startTime && ticketTab === tabId && !tab.url.includes("ticket")) {
    pushTime(ticketId, currentUserEmail)
  }
});

chrome.tabs.onRemoved.addListener((tabId, removeInfo) => {
  if (ticketTab === tabId) {
    pushTime(ticketId, currentUserEmail);
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      if (tabs.length > 0 && tabs[0].url) {
        console.log("onRemoved test triggered for " + tabs[0].url);
      } else {
        console.log(
          "Window closed. Awaiting activation of different browser window."
        );
      }
    });
  }
});

function pushTime(ticketId, email) {
  let end = Date.now();
  let duration = end - startTime;
  let durationMins = Math.floor(duration / 1000 / 60);
  let durationSecs = (duration / 1000) % 60;
  let durationMS = duration - durationMins * 60000 - durationSecs * 1000;
  console.log("submitting new log:");
  fetch("https://app.abodea.com/_hcms/api/time/record", {
    method: "POST",
    headers: new Headers({ "content-type": "application/json" }),
    body: JSON.stringify({
      ticketId: ticketId,
      email: email,
      duration: duration,
    }),
  })
    .then(function (response) {
      return response.json();
    })
    .then((res) => {
      console.log("successfully tracked time, hubspot response:");
      console.log(res);
    })
    .catch(
      (error) =>
        function () {
          console.log(error);
          chrome.notifications.create(
            "end-" + tabId,
            {
              iconUrl: "../../icons/full-icon_128.png",
              type: "basic",
              //contextMessage: 'Context message',
              message:
                "UNSUCCESSFULLY LOGGED TIME FOR " +
                email +
                "Expected duration: " +
                durationMins +
                " minutes and " +
                durationSecs +
                " seconds for ticket #" +
                ticketId,
              title: "ERROR LOGGING TIME",
            }
            //show error message
          );
        }
    );

  console.log("duration 2.5: " + duration);
  console.log(
    email +
      " tracked time on ticket# " +
      ticketId +
      " |  DURATION | minutes: " +
      durationMins +
      " seconds: " +
      durationSecs +
      " milliseconds: " +
      durationMS
  );

  // Create Chrome notification
  chrome.notifications.create(
    "end",
    {
      iconUrl: "../../icons/full-icon_128.png",
      type: "basic",
      //contextMessage: 'Context message',
      message:
        "Successfully tracked " +
        durationMins +
        " minutes and " +
        durationSecs +
        " seconds for ticket #" +
        ticketId,
      title: "Time Submitted",
    },
    function (context) {
      console.log("Last error:", chrome.runtime.lastError);
    }
  );
}
