importScripts('lib.js', 'brave-config.js');

const ALARM_NAME = 'leb2-calendar-sync';
const DEFAULT_SYNC_HOURS = 0.5;
const GOOGLE_TASKS_API = 'https://tasks.googleapis.com/tasks/v1';

async function getSyncHours() {
  const { syncHours } = await chrome.storage.local.get('syncHours');
  return LEB2Lib.parseSyncHours(syncHours) || DEFAULT_SYNC_HOURS;
}

async function scheduleAlarm(hours, delayInMinutes = hours * 60) {
  const parsed = LEB2Lib.parseSyncHours(hours);
  if (!parsed) throw new Error('Sync interval must use 0.5-hour steps from 0.5 to 168 hours.');
  await chrome.storage.local.set({ syncHours: parsed });
  await chrome.alarms.clear(ALARM_NAME);
  await chrome.alarms.create(ALARM_NAME, {
    delayInMinutes,
    periodInMinutes: parsed * 60
  });
  return parsed;
}

chrome.runtime.onInstalled.addListener(async () => {
  const hours = await getSyncHours();
  await scheduleAlarm(hours, 5);
});

chrome.runtime.onStartup.addListener(async () => {
  const hours = await getSyncHours();
  await scheduleAlarm(hours);
  syncAll(false).catch(saveError);
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === ALARM_NAME) syncAll(false).catch(saveError);
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'AUTH_GOOGLE') {
    authorizeGoogle()
      .then((result) => sendResponse({ ok: true, ...result }))
      .catch((error) => sendResponse({ ok: false, error: error.message }));
    return true;
  }
  if (message.type === 'SYNC_NOW') {
    syncAll(true)
      .then((result) => sendResponse({ ok: true, ...result }))
      .catch(async (error) => {
        await saveError(error);
        sendResponse({ ok: false, error: error.message });
      });
    return true;
  }
  if (message.type === 'GET_SETTINGS') {
    Promise.all([getSyncHours(), chrome.alarms.get(ALARM_NAME)])
      .then(([hours, alarm]) => sendResponse({ ok: true, hours, alarm }))
      .catch((error) => sendResponse({ ok: false, error: error.message }));
    return true;
  }
  if (message.type === 'SET_SYNC_HOURS') {
    scheduleAlarm(message.hours)
      .then((hours) => sendResponse({ ok: true, hours }))
      .catch((error) => sendResponse({ ok: false, error: error.message }));
    return true;
  }
});

function googleToken(interactive) {
  return new Promise((resolve, reject) => {
    chrome.identity.getAuthToken({ interactive }, (token) => {
      if (chrome.runtime.lastError || !token) {
        reject(new Error(chrome.runtime.lastError?.message || 'Google authorization was not granted.'));
      } else {
        resolve(token);
      }
    });
  });
}

async function runningInBrave() {
  try {
    return Boolean(navigator.brave && await navigator.brave.isBrave());
  } catch {
    return false;
  }
}

async function useLocalCompanion() {
  return Boolean(BRAVE_COMPANION?.enabled) || await runningInBrave();
}

async function companionRequest(path, options = {}) {
  const response = await fetch(`${BRAVE_COMPANION.url}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'X-LEB2-Secret': BRAVE_COMPANION.secret,
      ...(options.headers || {})
    }
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || body.ok === false) {
    throw new Error(body.error || 'The local Brave companion is not available.');
  }
  return body;
}

async function authorizeGoogle() {
  if (await useLocalCompanion()) {
    const status = await companionRequest('/status');
    if (!status.connected) {
      throw new Error(status.error || 'Google Tasks is not connected in the local companion.');
    }
    return { mode: 'brave-companion' };
  }
  await googleToken(true);
  return { mode: 'chrome' };
}

function waitForTab(tabId, timeoutMs = 30000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      chrome.tabs.onUpdated.removeListener(listener);
      reject(new Error('LEB2 took too long to load.'));
    }, timeoutMs);
    const listener = (updatedId, info, tab) => {
      if (updatedId === tabId && info.status === 'complete') {
        clearTimeout(timer);
        chrome.tabs.onUpdated.removeListener(listener);
        resolve(tab);
      }
    };
    chrome.tabs.onUpdated.addListener(listener);
  });
}

async function collectFromLeb2() {
  const tab = await chrome.tabs.create({ url: 'https://app.leb2.org/class', active: false });
  let loaded;
  try {
    loaded = await waitForTab(tab.id);
    if (!loaded.url?.startsWith('https://app.leb2.org/')) {
      throw new Error('LEB2 is not signed in. Sign in at app.leb2.org and try again.');
    }

    const [{ result }] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      world: 'MAIN',
      func: async () => {
        const cards = [...document.querySelectorAll('.class-card[data-url]')];
        const courses = cards.map((card) => {
          const id = (card.getAttribute('data-url') || '').match(/\/class\/(\d+)/)?.[1];
          const label = card.innerText.replace(/\s+/g, ' ').trim();
          const code = label.match(/^([A-Z]{2,5}\s+\d{2,4})\b/)?.[1] || `Class ${id}`;
          return { id, code, label };
        }).filter((course) => course.id);

        if (!courses.length) {
          throw new Error('No current LEB2 classes were found.');
        }

        const probe = await fetch(`/class/${courses[0].id}/activity`, { credentials: 'include' });
        const probeHtml = await probe.text();
        const studentId = probeHtml.match(/const\s+userId\s*=\s*(\d+)/)?.[1];
        const universityId = probeHtml.match(/\"university_id\":\"([^\"]+)\"/)?.[1];
        if (!studentId || !universityId) {
          throw new Error('Could not identify the signed-in LEB2 student.');
        }

        function activityUrl(classId) {
          const p = new URLSearchParams();
          p.set('class_id', classId);
          p.set('student_id', studentId);
          p.set('filter_groups[0][filters][0][key]', 'class_id');
          p.set('filter_groups[0][filters][0][value]', classId);
          p.append('sort[]', 'sequence');
          p.append('sort[]', 'id');
          p.append('select[]', 'activities:id,user_id,class_id,adv_starred,group_type,type,peer_assessment,is_allow_repeat,title,description,start_date,due_date,edit_group_mode,created_at');
          p.append('select[]', 'user:id,firstname_en,lastname_en,firstname_th,lastname_th');
          p.append('includes[]', 'user:sideload');
          p.append('includes[]', 'fileactivities:ids');
          p.append('includes[]', 'questions:ids');
          return `/api/get/assessment-activities/student?${p}`;
        }

        const groups = await Promise.all(courses.map(async (course) => {
          let role = 'Student';
          const roleResponse = await fetch(`/class/${course.id}/member/instructor`, { credentials: 'include' });
          if (roleResponse.ok) {
            const roleHtml = await roleResponse.text();
            const roleDoc = new DOMParser().parseFromString(roleHtml, 'text/html');
            const roleRow = [...roleDoc.querySelectorAll(`[data-userid="${studentId}"]`)]
              .map((element) => element.closest('tr'))
              .find(Boolean);
            role = roleRow?.querySelector('.role-col')?.textContent?.replace(/\s+/g, ' ').trim() || 'Student';
          }
          course.role = role;
          const normalizedRole = role.toLowerCase();
          if (['teacher', 'teacher assistant', 'teaching assistant', 'assistant'].includes(normalizedRole)) {
            return { course, activities: [], excluded: true };
          }

          const response = await fetch(activityUrl(course.id), { credentials: 'include' });
          if (!response.ok) throw new Error(`LEB2 returned ${response.status} for ${course.code}.`);
          const payload = await response.json();
          const activities = (payload.activities || []).map((activity) => ({
            id: activity.id,
            class_id: activity.class_id,
            title: activity.title,
            due_date: activity.due_date,
            start_date: activity.start_date,
            activity_submission_id: activity.activity_submission_id || null,
            activity_submission_submitted_at: activity.activity_submission_submitted_at || null,
            activity_submission_is_late: Boolean(activity.activity_submission_is_late)
          }));
          return { course, activities, excluded: false };
        }));

        return {
          courses: groups.filter((group) => !group.excluded),
          excludedTeachingClasses: groups.filter((group) => group.excluded).length,
          leb2UserId: universityId,
          studentIdFound: true
        };
      }
    });

    if (!result) throw new Error('LEB2 did not return any data.');
    return result;
  } finally {
    if (tab?.id) chrome.tabs.remove(tab.id).catch(() => {});
  }
}

async function googleRequest(path, token, options = {}) {
  const response = await fetch(`${GOOGLE_TASKS_API}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Google Tasks returned ${response.status}: ${body.slice(0, 300)}`);
  }
  return response.status === 204 ? null : response.json();
}

async function listGoogleTasks(token) {
  const tasks = [];
  let pageToken = '';
  do {
    const query = new URLSearchParams({
      showCompleted: 'true',
      showHidden: 'true',
      maxResults: '100'
    });
    if (pageToken) query.set('pageToken', pageToken);
    const page = await googleRequest(`/lists/@default/tasks?${query}`, token);
    tasks.push(...(page.items || []));
    pageToken = page.nextPageToken || '';
  } while (pageToken);
  return tasks;
}

async function upsertTask(token, activity, course, existingTasks) {
  const marker = `[LEB2_ACTIVITY_ID:${activity.id}]`;
  const existing = existingTasks.find((task) => task.notes?.includes(marker));
  const task = LEB2Lib.makeTask(activity, course, existing);
  if (!task) return { action: 'skipped' };

  if (existing) {
    await googleRequest(`/lists/@default/tasks/${encodeURIComponent(existing.id)}`, token, {
      method: 'PATCH',
      body: JSON.stringify(task)
    });
    return { action: 'updated' };
  }

  const created = await googleRequest('/lists/@default/tasks', token, {
    method: 'POST',
    body: JSON.stringify(task)
  });
  existingTasks.push(created);
  return { action: 'created' };
}

async function syncAll(interactive) {
  await chrome.action.setBadgeText({ text: '…' });
  await chrome.storage.local.remove('lastError');
  try {
    const leb2 = await collectFromLeb2();
    const items = leb2.courses.flatMap(({ course, activities }) =>
      activities.filter((activity) => activity.due_date).map((activity) => ({ course, activity }))
    );

    if (await useLocalCompanion()) {
      const payload = items.map(({ course, activity }) => ({
        activityId: String(activity.id),
        task: LEB2Lib.makeTask(activity, course)
      })).filter((item) => item.task);
      const result = await companionRequest('/sync', {
        method: 'POST',
        body: JSON.stringify({ leb2UserId: leb2.leb2UserId, items: payload })
      });
      result.excludedTeachingClasses = leb2.excludedTeachingClasses || 0;
      result.message += ` ${result.excludedTeachingClasses} teaching ${result.excludedTeachingClasses === 1 ? 'class' : 'classes'} excluded.`;
      await chrome.storage.local.set({ lastSync: new Date().toISOString(), lastResult: result, lastError: null });
      await chrome.action.setBadgeBackgroundColor({ color: '#19b4bd' });
      await chrome.action.setBadgeText({ text: String(result.tasks) });
      return result;
    }

    const token = await googleToken(interactive);
    const existingTasks = await listGoogleTasks(token);
    let created = 0;
    let updated = 0;
    let skipped = 0;
    for (const { course, activity } of items) {
      const result = await upsertTask(token, activity, course, existingTasks);
      if (result.action === 'created') created += 1;
      else if (result.action === 'updated') updated += 1;
      else skipped += 1;
    }

    const excludedTeachingClasses = leb2.excludedTeachingClasses || 0;
    const message = `${created} created, ${updated} updated${skipped ? `, ${skipped} skipped` : ''}. ${excludedTeachingClasses} teaching ${excludedTeachingClasses === 1 ? 'class' : 'classes'} excluded.`;
    const result = { tasks: items.length, synced: created + updated, created, updated, skipped, excludedTeachingClasses, message };
    await chrome.storage.local.set({ lastSync: new Date().toISOString(), lastResult: result, lastError: null });
    await chrome.action.setBadgeBackgroundColor({ color: '#19b4bd' });
    await chrome.action.setBadgeText({ text: String(items.length) });
    return result;
  } catch (error) {
    await chrome.action.setBadgeBackgroundColor({ color: '#b83a3a' });
    await chrome.action.setBadgeText({ text: '!' });
    throw error;
  }
}

async function saveError(error) {
  const message = error?.message || String(error);
  await chrome.storage.local.set({ lastError: message });
}
