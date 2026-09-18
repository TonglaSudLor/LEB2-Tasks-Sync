const $ = (id) => document.getElementById(id);

function setBusy(busy, text) {
  $('sync').disabled = busy;
  $('auth').disabled = busy;
  $('saveInterval').disabled = busy;
  $('status').textContent = text;
  $('status').className = `status ${busy ? 'working' : ''}`;
}

async function refresh() {
  const [data, settings] = await Promise.all([
    chrome.storage.local.get(['lastSync', 'lastResult', 'lastError']),
    chrome.runtime.sendMessage({ type: 'GET_SETTINGS' })
  ]);
  if (settings.ok) {
    $('syncHours').value = settings.hours;
    $('scheduleText').textContent = `Runs every ${LEB2Lib.formatSyncInterval(settings.hours)}`;
  }
  if (data.lastSync) $('lastSync').textContent = new Date(data.lastSync).toLocaleString();
  if (data.lastResult) {
    $('taskCount').textContent = data.lastResult.tasks;
    $('eventCount').textContent = data.lastResult.synced;
    $('status').textContent = data.lastResult.message || 'Last sync completed.';
    $('status').className = 'status success';
  }
  $('error').hidden = !data.lastError;
  $('error').textContent = data.lastError || '';
}

$('auth').addEventListener('click', async () => {
  setBusy(true, 'Connecting to Google…');
  const result = await chrome.runtime.sendMessage({ type: 'AUTH_GOOGLE' });
  setBusy(false, result.ok ? 'Google connected.' : 'Could not connect Google.');
  if (!result.ok) {
    $('error').hidden = false;
    $('error').textContent = result.error;
  }
});

$('saveInterval').addEventListener('click', async () => {
  setBusy(true, 'Saving sync interval…');
  const result = await chrome.runtime.sendMessage({
    type: 'SET_SYNC_HOURS',
    hours: $('syncHours').value
  });
  if (result.ok) {
    const interval = LEB2Lib.formatSyncInterval(result.hours);
    $('scheduleText').textContent = `Runs every ${interval}`;
    $('error').hidden = true;
    setBusy(false, `Automatic sync set to every ${interval}.`);
  } else {
    setBusy(false, 'Could not save interval.');
    $('error').hidden = false;
    $('error').textContent = result.error;
  }
});

$('sync').addEventListener('click', async () => {
  setBusy(true, 'Reading LEB2 and syncing…');
  const result = await chrome.runtime.sendMessage({ type: 'SYNC_NOW' });
  setBusy(false, result.ok ? result.message : 'Sync failed.');
  await refresh();
});

refresh();
