(function (root) {
  const BANGKOK_OFFSET = '+07:00';

  function buildActivityUrl(classId, studentId) {
    const params = new URLSearchParams();
    params.set('class_id', String(classId));
    params.set('student_id', String(studentId));
    params.set('filter_groups[0][filters][0][key]', 'class_id');
    params.set('filter_groups[0][filters][0][value]', String(classId));
    params.append('sort[]', 'sequence');
    params.append('sort[]', 'id');
    params.append('select[]', 'activities:id,user_id,class_id,adv_starred,group_type,type,peer_assessment,is_allow_repeat,title,description,start_date,due_date,edit_group_mode,created_at');
    params.append('select[]', 'user:id,firstname_en,lastname_en,firstname_th,lastname_th');
    params.append('includes[]', 'user:sideload');
    params.append('includes[]', 'fileactivities:ids');
    params.append('includes[]', 'questions:ids');
    return `https://app.leb2.org/api/get/assessment-activities/student?${params}`;
  }

  function bangkokIso(value) {
    if (!value) return null;
    const normalized = value.trim().replace(' ', 'T').replace(/\.\d+$/, '');
    return /(?:Z|[+-]\d\d:\d\d)$/.test(normalized)
      ? normalized
      : `${normalized}${BANGKOK_OFFSET}`;
  }

  function isSubmitted(activity) {
    return Boolean(activity.activity_submission_submitted_at || activity.activity_submission_id);
  }

  function makeEvent(activity, course) {
    const endIso = bangkokIso(activity.due_date);
    if (!endIso) return null;
    const end = new Date(endIso);
    if (Number.isNaN(end.getTime())) return null;
    const start = new Date(end.getTime() - 30 * 60 * 1000);
    const submitted = isSubmitted(activity);
    const code = course.code || `Class ${activity.class_id}`;
    return {
      summary: `${submitted ? '✅ ' : ''}[LEB2] ${code} — ${activity.title}`,
      description: [
        `LEB2 assessment: ${activity.title}`,
        `Course: ${course.label || code}`,
        `Status: ${submitted ? (activity.activity_submission_is_late ? 'Submitted late' : 'Submitted') : 'Not submitted'}`,
        '',
        `Open: https://app.leb2.org/class/${activity.class_id}/activity`
      ].join('\n'),
      start: { dateTime: start.toISOString(), timeZone: 'Asia/Bangkok' },
      end: { dateTime: end.toISOString(), timeZone: 'Asia/Bangkok' },
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'popup', minutes: 1440 },
          { method: 'popup', minutes: 60 }
        ]
      },
      extendedProperties: {
        private: {
          leb2ActivityId: String(activity.id),
          leb2ClassId: String(activity.class_id)
        }
      },
      source: {
        title: 'Open in LEB2',
        url: `https://app.leb2.org/class/${activity.class_id}/activity`
      }
    };
  }

  function courseFromCard(id, text) {
    const clean = String(text || '').replace(/\s+/g, ' ').trim();
    const code = (clean.match(/^([A-Z]{2,5}\s+\d{2,4})\b/) || [])[1] || `Class ${id}`;
    return { id: String(id), code, label: clean || code };
  }

  function parseSyncHours(value) {
    const hours = Number(value);
    return Number.isFinite(hours) && hours >= 0.5 && hours <= 168 && Number.isInteger(hours * 2) ? hours : null;
  }

  function formatSyncInterval(hours) {
    if (hours === 0.5) return '30 minutes';
    return `${hours} ${hours === 1 ? 'hour' : 'hours'}`;
  }

  function shouldSyncCourseRole(role) {
    const normalized = String(role || 'Student').trim().toLowerCase();
    return !['teacher', 'teacher assistant', 'teaching assistant', 'assistant'].includes(normalized);
  }

  function makeTask(activity, course, existing = null) {
    if (!activity.due_date) return null;
    const submitted = isSubmitted(activity);
    const code = course.code || `Class ${activity.class_id}`;
    const task = {
      title: `[LEB2] ${code} — ${activity.title}`,
      notes: [
        `[LEB2_ACTIVITY_ID:${activity.id}]`,
        `Course: ${course.label || code}`,
        `Status: ${submitted ? (activity.activity_submission_is_late ? 'Submitted late' : 'Submitted') : 'Not submitted'}`,
        `Open: https://app.leb2.org/class/${activity.class_id}/activity`
      ].join('\n'),
      due: `${String(activity.due_date).slice(0, 10)}T00:00:00.000Z`
    };
    if (submitted) {
      const submittedAt = activity.activity_submission_submitted_at?.date;
      task.status = 'completed';
      task.completed = submittedAt ? new Date(bangkokIso(submittedAt)).toISOString() : new Date().toISOString();
    } else if (existing?.status === 'completed') {
      task.status = 'completed';
      task.completed = existing.completed;
    } else {
      task.status = 'needsAction';
    }
    return task;
  }

  const api = { buildActivityUrl, bangkokIso, isSubmitted, makeEvent, courseFromCard, parseSyncHours, formatSyncInterval, shouldSyncCourseRole, makeTask };
  root.LEB2Lib = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(globalThis);
