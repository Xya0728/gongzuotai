'use strict';

/* =========================================================
   智能排程：本地规则引擎
   ---------------------------------------------------------
   读今日计划、学习目标、训练记录、订单库存、设备，
   生成一份「参考日程」草稿。只出草稿，用户逐条采用/修改。
   ========================================================= */

const SCHEDULE_MODULES = {
  work: { label: '跨境工作', tone: 'orange' },
  study: { label: '学习', tone: 'violet' },
  fitness: { label: '健身', tone: 'green' },
  rest: { label: '娱乐', tone: 'blue' },
  plan: { label: '继续计划', tone: 'teal' },
};

const SCHEDULE_MAX_PER_MODULE = { work: 2, study: 2, fitness: 1, rest: 1, plan: 2 };
const SCHEDULE_MAX_ITEMS = 6;

function schedulePrefs() {
  const s = Store.data.settings;
  if (!s.schedule || typeof s.schedule !== 'object') s.schedule = scheduleDefaults();
  const p = s.schedule;
  if (!Array.isArray(p.fixed)) p.fixed = [];
  return p;
}

function scheduleBounds(prefs) {
  let start = timeToMin(prefs.wake);
  let end = timeToMin(prefs.sleep);
  if (start === null) start = 7 * 60 + 30;
  if (end === null) end = 23 * 60 + 30;
  if (end - start < 120) {
    start = 8 * 60;
    end = 23 * 60;
  }
  return { start: Math.max(0, start), end: Math.min(24 * 60 - 1, end) };
}

/* 固定安排（午餐/晚餐/自定义）— 每天都生效 */
function scheduleFixedBlocks(date, prefs) {
  const blocks = [];
  const push = (label, from, to) => {
    const s = timeToMin(from);
    const e = timeToMin(to);
    if (s === null || e === null || e <= s) return;
    blocks.push({ label: label, startMin: s, endMin: e });
  };
  push('午餐', prefs.lunchStart, prefs.lunchEnd);
  push('晚餐', prefs.dinnerStart, prefs.dinnerEnd);
  (prefs.fixed || []).forEach((b) => push(b.label || '固定安排', b.start, b.end));
  return blocks;
}

function scheduleFreeSlot(busy, from, to, duration) {
  for (let t = from; t + duration <= to; t += 5) {
    const clash = busy.some((slot) => t < slot[1] && t + duration > slot[0]);
    if (!clash) return t;
  }
  return null;
}

function scheduleClipWindow(from, to, bounds) {
  const s = Math.max(bounds.start, timeToMin(from));
  const e = Math.min(bounds.end, timeToMin(to));
  return e - s > 0 ? [s, e] : null;
}

function scheduleNorm(text) {
  return String(text || '')
    .replace(/\s+/g, '')
    .toLowerCase();
}

/* 与当天已有安排/固定安排是否冲突；返回冲突说明或空字符串 */
function scheduleConflictText(date, start, end) {
  const s = timeToMin(start);
  const e = timeToMin(end);
  if (s === null || e === null || e <= s) return '时间不完整';
  const fixed = scheduleFixedBlocks(date, schedulePrefs());
  for (const b of fixed) {
    if (s < b.endMin && e > b.startMin) return b.label + ' ' + minToTime(b.startMin) + '–' + minToTime(b.endMin);
  }
  const items = Store.data.plan.items.filter((i) => i.date === date);
  for (const i of items) {
    const is = timeToMin(i.start);
    const ie = timeToMin(i.end);
    if (is === null || ie === null) continue;
    if (s < ie && e > is) return '「' + i.title + '」';
  }
  return '';
}

const Scheduler = {
  prefs: schedulePrefs,
  bounds: scheduleBounds,
  fixedBlocks: scheduleFixedBlocks,

  /* 生成一份草稿（不写入计划） */
  build(date, opts) {
    const o = opts || {};
    const d = Store.data;
    const prefs = schedulePrefs();
    const bounds = scheduleBounds(prefs);
    const focus = Math.max(15, Math.min(180, Number(prefs.focusMin) || 50));
    const brk = Math.max(0, Math.min(30, Number(prefs.breakMin) || 0));

    const fixed = scheduleFixedBlocks(date, prefs);
    const busy = fixed.map((b) => [b.startMin, b.endMin]);
    const dayItems = d.plan.items.filter((i) => i.date === date);
    dayItems.forEach((i) => {
      const s = timeToMin(i.start);
      const e = timeToMin(i.end);
      if (s !== null && e !== null && e > s) busy.push([s, e]);
    });

    const candidates = [];

    /* ---- 跨境工作 ---- */
    const pendingOrders = d.work.orders.filter((o2) => o2.status === 'pending');
    if (pendingOrders.length) {
      const backlog = pendingOrders.filter((o2) => o2.date < date).length;
      candidates.push({
        module: 'work',
        title: '处理 ' + pendingOrders.length + ' 个待发货订单',
        duration: Math.min(90, 25 + pendingOrders.length * 10),
        priority: 'high',
        windows: [['09:00', '12:00'], ['14:00', '18:00']],
        score: 55 + Math.min(25, pendingOrders.length * 6) + Math.min(15, backlog * 5),
        reason:
          '有 ' + pendingOrders.length + ' 个订单待发货' +
          (backlog ? '，其中 ' + backlog + ' 个是之前积压的' : ''),
      });
    }

    const lowStock = d.work.stock.filter((s) => Number(s.qty) <= Number(s.safe));
    if (lowStock.length) {
      const names = lowStock.slice(0, 3).map((s) => s.name);
      candidates.push({
        module: 'work',
        title: '补货：' + names.join('、') + (lowStock.length > 3 ? ' 等' : ''),
        duration: 45,
        priority: 'mid',
        windows: [['10:00', '12:00'], ['14:00', '17:00']],
        score: 34 + lowStock.length * 6,
        reason:
          lowStock.length + ' 项库存低于安全线（' +
          lowStock.slice(0, 2).map((s) => s.name + ' ' + s.qty + '/' + s.safe).join('、') + '）',
      });
    }

    const research = d.work.products.filter((p) => p.stage === 'research' || p.stage === 'testing');
    if (research.length) {
      candidates.push({
        module: 'work',
        title: '选品：' + research[0].name,
        duration: 45,
        priority: 'mid',
        windows: [['14:00', '18:00']],
        score: 30,
        reason: '选品卡在「' + (research[0].stage === 'testing' ? '测试' : '调研') + '」阶段，往前推一步',
      });
    }

    /* ---- 学习 ---- */
    const activeGoals = d.study.goals.filter((g) => g.status === 'active');
    const learnedByGoal = {};
    d.study.logs.forEach((l) => {
      if (l.goalId) learnedByGoal[l.goalId] = (learnedByGoal[l.goalId] || 0) + (Number(l.minutes) || 0);
    });
    activeGoals.forEach((g) => {
      const target = (Number(g.targetHours) || 0) * 60;
      const learned = learnedByGoal[g.id] || 0;
      const left = target ? Math.max(0, target - learned) : 0;
      const daysLeft = g.deadline ? diffDays(date, g.deadline) : null;
      let score = 38;
      let reason = g.category ? g.category + '目标' : '学习目标';
      if (target) {
        reason += '，已学 ' + hoursText(learned) + ' / ' + g.targetHours + ' 小时';
        score += Math.min(20, Math.round(left / 60) * 2);
      }
      if (daysLeft !== null) {
        if (daysLeft < 0) {
          reason += '，已超期 ' + -daysLeft + ' 天';
          score += 30;
        } else if (daysLeft <= 7) {
          reason += '，还有 ' + daysLeft + ' 天截止';
          score += 24 - daysLeft * 2;
        } else {
          reason += '，' + daysLeft + ' 天后截止';
          score += 4;
        }
      }
      if (!target && daysLeft === null) reason += '，可以推进一点';
      candidates.push({
        module: 'study',
        title: '学习 · ' + g.title,
        duration: focus,
        priority: daysLeft !== null && daysLeft <= 3 ? 'high' : 'mid',
        windows: [['08:00', '12:00'], ['14:00', '18:00'], ['19:00', '22:00']],
        score: score,
        reason: reason,
      });
    });

    /* ---- 健身 ---- */
    const weekStart = weekStartKey(date);
    const weekSessions = d.fitness.sessions.filter((s) => s.date >= weekStart && s.date <= date);
    const gymTarget = Math.max(0, Number(prefs.gymPerWeek) || 0);
    const deficit = Math.max(0, gymTarget - weekSessions.length);
    const alreadyPlanned = d.fitness.plans.some((p) => p.date === date);
    const routines = d.fitness.routines || [];
    if (deficit > 0 && routines.length && !alreadyPlanned) {
      const ranked = routines
        .map((r) => {
          const last = d.fitness.sessions
            .filter((s) => s.name === r.name)
            .sort((a, b) => String(b.date).localeCompare(String(a.date)))[0];
          return { routine: r, last: last, gap: last ? diffDays(last.date, date) : 999 };
        })
        .sort((a, b) => b.gap - a.gap);
      const pick = ranked[0];
      candidates.push({
        module: 'fitness',
        title: '训练 · ' + pick.routine.name,
        duration: 60,
        priority: 'mid',
        windows: [['17:00', '21:00'], ['07:00', '09:00']],
        score: 42 + deficit * 8 + (pick.gap >= 7 ? 12 : pick.gap >= 3 ? 6 : 0),
        reason:
          '本周已练 ' + weekSessions.length + ' 次，目标 ' + gymTarget + ' 次' +
          (pick.last ? '；上次「' + pick.routine.name + '」是 ' + pick.gap + ' 天前' : '；最近还没练过「' + pick.routine.name + '」'),
      });
    }

    /* ---- 娱乐 / 放松 ---- */
    const devices = d.games.devices || [];
    if (devices.length) {
      const hasPlay = devices.some((x) => x.type === 'keyboard' || x.type === 'mouse');
      const limit = Math.max(20, Math.min(180, Number(prefs.entertainmentMin) || 60));
      candidates.push({
        module: 'rest',
        title: '娱乐放松 · ' + (hasPlay ? '玩会儿游戏' : '听歌 / 看剧'),
        duration: Math.min(limit, 60),
        priority: 'low',
        windows: [['20:00', '22:30']],
        score: 12,
        reason: '今天留一段放松时间，上限 ' + limit + ' 分钟，到点就收',
      });
    }

    /* ---- 之前没做完的计划 ---- */
    const leftover = d.plan.items
      .filter((i) => i.date === addDays(date, -1))
      .slice(0, 2);
    leftover.forEach((i) => {
      const late = diffDays(i.date, date);
      candidates.push({
        module: 'plan',
        title: '继续：' + i.title,
        duration: 40,
        priority: late >= 2 ? 'high' : 'mid',
        windows: [['09:00', '12:00'], ['14:00', '18:00'], ['19:00', '21:30']],
        score: 46 + Math.min(20, late * 4),
        reason: late + ' 天前排的计划，顺延过来',
      });
    });

    /* ---- 打分后逐条塞进空闲时段 ---- */
    candidates.sort((a, b) => b.score - a.score);
    const chosen = [];
    const counts = {};
    for (const c of candidates) {
      if (chosen.length >= SCHEDULE_MAX_ITEMS) break;
      const cap = SCHEDULE_MAX_PER_MODULE[c.module] || 1;
      if ((counts[c.module] || 0) >= cap) continue;
      const duration = Math.max(20, Math.round(c.duration / 5) * 5);

      let start = null;
      for (const win of c.windows || []) {
        const clipped = scheduleClipWindow(win[0], win[1], bounds);
        if (!clipped || clipped[1] - clipped[0] < duration) continue;
        start = scheduleFreeSlot(busy, clipped[0], clipped[1], duration);
        if (start !== null) break;
      }
      if (start === null) start = scheduleFreeSlot(busy, bounds.start, bounds.end, duration);
      if (start === null) continue;

      chosen.push({
        id: uid(),
        title: c.title,
        module: c.module,
        start: minToTime(start),
        end: minToTime(start + duration),
        priority: c.priority,
        reason: c.reason,
        score: c.score,
      });
      busy.push([start, start + duration + brk]);
      counts[c.module] = (counts[c.module] || 0) + 1;
    }

    chosen.sort((a, b) => a.start.localeCompare(b.start));

    const factors = [];
    if (pendingOrders.length) factors.push(pendingOrders.length + ' 个待发货订单');
    if (lowStock.length) factors.push(lowStock.length + ' 项库存预警');
    if (activeGoals.length) factors.push(activeGoals.length + ' 个学习目标');
    if (gymTarget) factors.push('本周训练 ' + weekSessions.length + '/' + gymTarget + ' 次');
    if (leftover.length) factors.push(leftover.length + ' 件遗留计划');

    const summary = chosen.length
      ? '参考了 ' + (factors.length ? factors.join('、') : '你的作息') + '，以及固定安排；点任意建议可以改时间或标题'
      : '今天没有必须安排的事，留白也挺好；想更准一点，先添几个学习目标或待发货订单';

    return {
      batchId: 'dr-' + uid(),
      date: date,
      createdAt: Date.now(),
      auto: !!o.auto,
      status: 'ready',
      summary: summary,
      items: chosen,
    };
  },

  /* 当天没有草稿时自动准备一份（每天只准备一次） */
  ensure(date) {
    const drafts = Store.data.plan.drafts || (Store.data.plan.drafts = {});
    if (drafts[date]) return drafts[date];
    const draft = Scheduler.build(date, { auto: true });
    drafts[date] = draft;
    Scheduler.pruneDrafts();
    Store.save();
    return draft;
  },

  regenerate(date) {
    const drafts = Store.data.plan.drafts || (Store.data.plan.drafts = {});
    const draft = Scheduler.build(date);
    drafts[date] = draft;
    Scheduler.pruneDrafts();
    Store.save();
    return draft;
  },

  /* 只保留最近 60 天，避免数据文件越来越胖 */
  pruneDrafts() {
    const drafts = Store.data.plan.drafts || {};
    const keys = Object.keys(drafts).sort();
    const drop = keys.slice(0, Math.max(0, keys.length - 60));
    drop.forEach((k) => delete drafts[k]);
  },
};
