let tracking = false;
let startTime = null;
let ticketTab = null;
let ticketWindow = null;
let ticketId = null;
let currentUserEmail = null;
let visitedURLs = ["", ""];

//Logic to keep service worker active indefinitely
let lifeline;

keepAlive();

chrome.runtime.onConnect.addListener((port) => {
  if (port.name === "keepAlive") {
    lifeline = port;
    setTimeout(keepAliveForced, 295e3); // 5 minutes minus 5 seconds
    port.onDisconnect.addListener(keepAliveForced);
  }
});

function keepAliveForced() {
  lifeline?.disconnect();
  lifeline = null;
  keepAlive();
}

async function keepAlive() {
  if (lifeline) return;
  for (const tab of await chrome.tabs.query({ url: "*://*/*" })) {
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        function: () => chrome.runtime.connect({ name: "keepAlive" }),
        // `function` will become `func` in Chrome 93+
      });
      chrome.tabs.onUpdated.removeListener(retryOnTabUpdate);
      return;
    } catch (e) {}
  }
  chrome.tabs.onUpdated.addListener(retryOnTabUpdate);
}

async function retryOnTabUpdate(tabId, info, tab) {
  if (info.url && /^(file|https?):/.test(info.url)) {
    keepAlive();
  }
}

//----------------Event Listeners for tracking---------------

//Any time a tab is opened, or navigated to
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  console.log(
    "ON UPDATED ----------------------------------" + changeInfo.status
  );
  //Track all previously visited URLs
  visitedURLs.push(tab.url);

  if (!currentUserEmail && changeInfo.status == "complete") {
    console.log("page loaded");
    chrome.scripting.executeScript({
      target: { tabId },
      function: () => {
        console.log("in scripting tag");
        let email = document.querySelector(".user-info-email").innerText;
        console.log(email);
        //alert('code: ' + code + ' email: ' + email);
        chrome.storage.sync.set({ email: email });
      },
    });
  }

  if (
    //Check that there is no currently active ticket, and we are not just changing url within the same ticket
    !startTime &&
    tab.url &&
    tab.url.includes("https://app.hubspot.com") &&
    tab.url.includes("8266889") &&
    tab.url.includes("ticket/") &&
    !tab.url.includes("?") &&
    !(
      visitedURLs[visitedURLs.length - 2].includes("?") &&
      visitedURLs[visitedURLs.length - 2].includes("https://app.hubspot.com") &&
      visitedURLs[visitedURLs.length - 2].includes("8266889")
    )
  ) {
    //Create a new timestamp, and start ticket tracking
    console.log("new ticket opened:", ticketId);
    tracking = true;
    startTime = Date.now();
    ticketTab = tabId;
    ticketWindow = tab.windowId;
    ticketId = tab.url.match(/ticket\/(\d+)\D*$/)[1];
  } else if (
    //Check to see if we navigated away without closing the tab
    tracking &&
    ticketTab === tabId &&
    !tab.url.includes("https://app.hubspot.com/contacts/8266889/ticket/")
  ) {
    console.log("closing ticket:", ticketId);
    tracking = false;
    pushTime(ticketId);
    chrome.action.setIcon({
      path: {
        19: "/icons/empty-icon_19.png",
        48: "/icons/empty-icon_48.png",
      },
    });
  }

  //Icon logic
  if (tracking) {
    //full icon while tracking
    chrome.action.setIcon({
      path: {
        19: "/icons/full-icon_19.png",
        48: "/icons/full-icon_48.png",
      },
    });
  } else {
    //icon outline all other times
    chrome.action.setIcon({
      path: {
        19: "/icons/empty-icon_19.png",
        48: "/icons/empty-icon_48.png",
      },
    });
  }
});

//If the tab is closed
chrome.tabs.onRemoved.addListener((tabId, removeInfo) => {
  //And the tab that was closed was the ticket tab
  if (ticketTab === tabId) {
    //create a new ticket entry
    tracking = false;
    chrome.action.setIcon({
      path: {
        19: "/icons/empty-icon_19.png",
        48: "/icons/empty-icon_48.png",
      },
    });
    pushTime(ticketId);
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

//When the extension icon is clicked
chrome.action.onClicked.addListener(function (tab) {
  if (tracking) {
    //If a ticket is currently active
    //move to the ticket tab
    chrome.windows.update(ticketWindow, { focused: true });
    chrome.tabs.update(ticketTab, { selected: true });
    //and alert the user of current ticket duration
    let timeStamp = Date.now();
    let duration = timeStamp - startTime;
    let mins = Math.floor(duration / 60000);
    let secs = Math.floor(duration / 1000) % 60;

    chrome.notifications.create(
      "tracking",
      {
        iconUrl: "/icons/full-icon_128.png",
        type: "basic",
        //contextMessage: 'Context message',
        message:
          "Tracked " +
          mins +
          " minutes and " +
          secs +
          " seconds for ticket #" +
          ticketId,
        title: "Time Tracked",
      },
      function (context) {
        console.log("Last error:", chrome.runtime.lastError);
      }
    );
  } else {
    chrome.notifications.create("no ticket", {
      iconUrl: "/icons/full-icon_128.png",
      type: "basic",
      //contextMessage: 'Context message',
      message: "No open tickets",
      title: "No Ticket",
    });
  }
});

// Reset ticketWindow when tab is moved to a new window

chrome.tabs.onAttached.addListener((tabId, props) => {
  console.log(
    "Previously tracked tab " +
      ticketTab +
      "| active tab id: " +
      ticketWindow
  );
  if (tracking && tabId === ticketTab) {
    ticketTab = tabId;
    ticketWindow = props.newWindowId;
  }
});

//-------------------Helper Functions-------------------------

//Get email for currently logged in google user
async function getEmail(tabId) {
  console.log("in get email");

  //console.log(`User set to: ${currentUserEmail}`); // not sure why but I was prompted to change the console log code to this by a visual studio code tool tip
}

//Create a new call entry and push to Abodea HS CMS
async function pushTime(ticketId) {

  await chrome.storage.sync.get((res) => {
    let email = res.email;
    let end = Date.now();
    let duration = end - startTime;
    let durationMins = Math.floor(duration / 60000);
    let durationSecs = Math.floor(duration / 1000) % 60;
    let durationMS = duration - durationMins * 60000 - durationSecs * 1000;
    console.log("--------------SUBMITTING NEW LOG---------------");
    console.log("user email:", email);
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
        //on successful response clear global variables
        startTime = null;
        ticketTab = null;
        ticketWindow = null;
        ticketId = null;
        currentUserEmail = null;
        tracking = false
        console.log(res);
      })
      .catch(
        (error) =>
          function () {
            console.log(error);
            chrome.notifications.create(
              "end-" + tabId,
              {
                iconUrl: "/icons/full-icon_128.png",
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
        iconUrl: "/icons/full-icon_128.png",
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
  });
}
