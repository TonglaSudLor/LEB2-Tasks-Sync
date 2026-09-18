const assert = require('node:assert/strict');
const lib = require('../extension/lib.js');

const url = new URL(lib.buildActivityUrl(1580109, 10006950));
assert.equal(url.origin, 'https://app.leb2.org');
assert.equal(url.searchParams.get('class_id'), '1580109');
assert.equal(url.searchParams.get('student_id'), '10006950');
assert.equal(url.searchParams.getAll('sort[]').length, 2);

assert.equal(lib.bangkokIso('2026-08-31 00:00:59'), '2026-08-31T00:00:59+07:00');
const course = lib.courseFromCard('1', 'FRA 341 BASIC IMAGE PROCESSING Section 1 Semester 1/2026');
assert.equal(course.code, 'FRA 341');

const event = lib.makeEvent({
  id: 22,
  class_id: 1580109,
  title: 'WS2',
  due_date: '2026-08-31 00:00:59',
  activity_submission_id: null
}, course);
assert.equal(event.summary, '[LEB2] FRA 341 — WS2');
assert.equal(event.end.dateTime, '2026-08-30T17:00:59.000Z');
assert.equal(event.extendedProperties.private.leb2ActivityId, '22');

assert.equal(lib.parseSyncHours('1'), 1);
assert.equal(lib.parseSyncHours('12'), 12);
assert.equal(lib.parseSyncHours('168'), 168);
assert.equal(lib.parseSyncHours('0'), null);
assert.equal(lib.parseSyncHours('0.5'), 0.5);
assert.equal(lib.parseSyncHours('2.5'), 2.5);
assert.equal(lib.parseSyncHours('0.25'), null);
assert.equal(lib.parseSyncHours('abc'), null);
assert.equal(lib.parseSyncHours('169'), null);
assert.equal(lib.formatSyncInterval(0.5), '30 minutes');
assert.equal(lib.formatSyncInterval(1), '1 hour');
assert.equal(lib.formatSyncInterval(2.5), '2.5 hours');

assert.equal(lib.shouldSyncCourseRole('Student'), true);
assert.equal(lib.shouldSyncCourseRole('Owner'), true);
assert.equal(lib.shouldSyncCourseRole('Teacher'), false);
assert.equal(lib.shouldSyncCourseRole('Teaching Assistant'), false);

const task = lib.makeTask({
  id: 22,
  class_id: 1580109,
  title: 'WS2',
  due_date: '2026-08-31 00:00:59',
  activity_submission_id: null
}, course);
assert.equal(task.title, '[LEB2] FRA 341 — WS2');
assert.equal(task.due, '2026-08-31T00:00:00.000Z');
assert.match(task.notes, /\[LEB2_ACTIVITY_ID:22\]/);
assert.equal(task.status, 'needsAction');

const submittedTask = lib.makeTask({
  id: 23,
  class_id: 1580109,
  title: 'WS3',
  due_date: '2026-09-07 00:00:59',
  activity_submission_id: 99,
  activity_submission_submitted_at: { date: '2026-09-06 10:30:00.000000' }
}, course);
assert.equal(submittedTask.status, 'completed');
assert.equal(submittedTask.completed, '2026-09-06T03:30:00.000Z');

console.log('All lib tests passed.');
