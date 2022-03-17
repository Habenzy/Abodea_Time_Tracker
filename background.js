let startTime = null;
let ticketTab = null;
let ticketWindow = null;
let ticketId = null;
let currentUserEmail = null;
let visitedURLs = [];

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  console.log(
    "ON UPDATED ----------------------------------" + changeInfo.status
  );
  console.log("tabId:", tabId);
  visitedURLs.push(tab.url);

  if (
    !startTime &&
    tab.url &&
    tab.url.includes("https://app.hubspot.com") &&
    tab.url.includes("8266889") &&
    tab.url.includes("ticket") &&
    !tab.url.includes("?") && //This was an attempt at preventing a time reset on note or email open, it was unsuccessful
    //because it resets when it leaves AND WHEN IT COMES BACK
    //I need to make sure the previous URL also didn't include the app identifiers and a question mark
    !(
      visitedURLs[visitedURLs.length - 2].includes("?") &&
      visitedURLs[visitedURLs.length - 2].includes("https://app.hubspot.com") &&
      visitedURLs[visitedURLs.length - 2].includes("8266889")
    )//It FUCKING WORKED!!!!!!!!
    //Now to apply it to the fancy version and see if that works.
  ) {
    startTime = Date.now();
    ticketTab = tabId;
    ticketWindow = tab.windowId;
    ticketId = tab.url.match(/ticket\/(\d+)\D*$/)[1];
    if (!currentUserEmail) {
      getEmail(tab.id);
    }
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

async function getEmail() {
  await chrome.identity.getProfileUserInfo(
    { accountStatus: "ANY" },
    (userInfo) => {
      currentUserEmail = userInfo.email;
    }
  );
}

function pushTime(ticketId, email) {
  let end = Date.now();
  let duration = end - startTime;
  let durationMins = Math.floor(duration / 1000 / 60);
  let durationSecs = (duration / 1000) % 60;
  let durationMS = duration - durationMins * 60000 - durationSecs * 1000;
  console.log("submitting new log:");
  console.log("start:", startTime);
  console.log("end:", end);
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
      startTime = null;
      ticketTab = null;
      ticketWindow = null;
      ticketId = null;
      currentUserEmail = null;
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
