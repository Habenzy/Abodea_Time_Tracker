## ABODEA TIME TRACKER
### VERSION 3

03/17/2022 - Version: 3.0

03/15/2022 - Version: 2.7
Updated by Bob Stauss @ Impulse Creative

CHANGE LOG:
* moved README to dedicated file
* Updated manifest to version 3 and changed process to use service worker rather than background process per [this documentation](https://developer.chrome.com/docs/extensions/mv3/intro/mv3-migration/)
* Email now fetched through Google auth rather than DOM query
* Fixed bug where clicking on the extension icon from a different window would not foreground the tracked tab
* Fixed bug where icon color would not always change on focus change (specifically when using <kbd>alt</kbd> + <kbd>Tab</kbd> to change focus)

KNOWN ISSUES:

Clicking outside of the chrome window will not fire chrome events so the icon color does not change when clicking other applications

/////////////////////////////////////
///////////   UPDATE LOG  ///////////
/////////////////////////////////////

02/14/2022 - VERSION 2.66
Updated by Kendra Ring at Impulse Creative
UPDATES:

Fixing Errors (2) :
1. Updated regX again to also acommodate url strings with no non-digit characters at the end of the ticket ID.
2. Re-added "newticketID" variable definition to line 167, which was somehow accidentally removed since version 2.6.

///////////////////////////////////////


02/14/2022 - VERSION 2.60

UPDATES:

Fixing Errors (1) :
1. We were originally testing ticket urls by searching for a url that ends in "/", but sometimes it ends in a "?". To fix this,
I updated the regex to instead look for any non-digit character (/D) to signify the ending, which would work with /,?, and any other
non-digit character.

///////////////////////////////////////


02/07/2022 - VERSION 2.50

UPDATES:

Improving Accuracy (2) :
1. The code does not always have enough time to grab email address before users navigate away. To solve this, I now have the code run on the tracked tab 
  regardless of whether it is currently active (allowing users to safely navigate away.) 
2. In addition, I am reducing the risk of error by only having the tracker grab it once instead of every time (which works because users are not sharing devices.)
3. I seperated the start/stop timetracking into two functions for ease of use.

Fixing Errors (1) :
1. To ensure that the email address is grabbed from the content of the tracked ticket page, I added a filter for the onupdated listener that the changeinfo must be complete before toggling the tracking.
  This means that the page will be fully loaded and therefore it will not be an issue grabbing the user email from the page content.

///////////////////////////////////////



01/20/2022 - VERSION 2.40

UPDATES:

Improving Accuracy (2) :
1. Some machines are not using time tracker successfully, but others are. We found an old thread about how some machines trigger "onReplaced" instead of "onUpdated", 
  possibly due to loading a pre-rendered tab. We've added this listener in to see if that will resolve the issue.
2. Added console logs for each listener to help give us more details on what is happening on those machines, so that we can at least get some info on whether they are being triggered
  in the way we expect. This will be especially useful if update #1 does not resolve the issue.

///////////////////////////////////////


11/23/2021 - VERSION 2.35

UPDATES:

Fixing Errors (1) :
1. To ensure that the email address is grabbed from the content of the tracked ticket page, I added a filter for the onupdated listener that the changeinfo must be complete before toggling the tracking.
  This means that the page will be fully loaded and therefore it will not be an issue grabbing the user email from the page content.

///////////////////////////////////////

11/23/2021 - VERSION 2.2

UPDATES:

Improving Accuracy (1) :
1. Detached & attached listenter timing were sometimes off, causing the windowID to not get updated consistently. Fortunately, I discovered that the tab ID does not change when 
  it is moved to a new window. so I removed the detached listener code and updated the attached listener to check for tabId matches.
2. Added check to prevent errors when a window is closed but there isn't another browser window in focus -- this was not breaking the code, but it creates a more accurate console log.

New Features (1) :
1. Added notification of the current amount of time tracked so far, triggered by clicking the icon while ALREADY ON the active tab. (clicking while not on the active tab still redirects to the active tab)


///////////////////////////////////////

11/19/2021 - VERSION 2.1
 
UPDATES:

Fixing Errors (1) :
1. Adjusted code to filter the URL change listener to only fire if the URL that changed is in an active tab.


///////////////////////////////////////

11/15/2021 - VERSION 2.0

UPDATES:

Fixing Errors (1) :
1. Adjusted code in portal’s recordEngagement.js file to remove superfluous “/1000”. Previously the duration was being recorded as MICROseconds rather than MILLIseconds.

Improving Accuracy (4) :
1. Removed rounding from recordEngagement.js file and changed to import milliseconds into ticket_activity_time property. Added a calculated field to convert the milliseconds into minutes.
2. Modified listeners to assess whether an existing tab navigates to a page containing a ticket. Previously it only monitored if an activated tab was a ticket URL at the moment of activation.
3. Added automatic update of the tracked tab ID & tracked window ID if the tracked tab is moved to a new location.
4. Created listener to assess ticket status of active page if a different window is focused on.
5. Created a unified “ticket test” function to be called by listeners, allowing us to keep the long code to a single iteration and reduce the likelihood of inconsistency.

New Features (5) :
1. Changed bell icon to Abodea logo for personalization.
2. Added 3rd icon state; in addition to “tracking” and “not tracking”, we now have “tracking, but not this current tab.”
3. Added ability to click icon while tracking to be automatically directed to the tab being tracked.
4. Added hover text on icon to display active ticket # (if tracking).
5. Added chrome notification upon end of tracking session, detailing the duration and ticket ID.
