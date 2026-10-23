/* CareFlow: self-contained, synthetic-data product demonstration. */
(() => {
  'use strict';

  const boot = () => {
    const mount = document.getElementById('product-demo');
    if (!mount) return;

    const CARE = {
      self: { label: '自理照護', cost: 20000, description: '保留熟悉的生活，安排日常支持。', icon: '01' },
      home: { label: '居家照護', cost: 30000, description: '在家接受協助，重新安排照護費用。', icon: '02' },
      facility: { label: '機構照護', cost: 40000, description: '轉換照護環境，先看清每月支出。', icon: '03' }
    };
    const STEPS = ['照護方式', '每月費用', '給付狀態', '情境比較', '送請確認'];
    const FIELDS = {
      funds: { label: '本次試算資金', unit: '元', max: 1000000000 },
      income: { label: '已確認每月收入', unit: '元／月', max: 100000000 },
      living: { label: '其他生活費', unit: '元／月', max: 100000000 },
      careCost: { label: '每月照護費', unit: '元／月', max: 100000000 },
      comparisonCost: { label: '自訂情境的照護費', unit: '元／月', max: 100000000 }
    };
    const number = value => new Intl.NumberFormat('zh-TW', { maximumFractionDigits: 0 }).format(value);
    const escape = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const initial = () => ({ step: 0, careType: 'self', funds: 2400000, income: 10000, living: 10000, careCost: 20000, comparisonCost: 40000, drafts: {}, errors: {}, benefitExpanded: false, submitted: false });
    let state = initial();
    let announceTimer;

    function calculate(cost = state.careCost) {
      const expense = state.living + cost;
      const gap = expense - state.income;
      return {
        totalMonthlyExpense: expense,
        monthlyShortfall: Math.max(0, gap),
        monthlySurplus: Math.max(0, -gap),
        months: gap > 0 ? Math.floor(state.funds / gap) : null,
        balanced: gap <= 0
      };
    }

    function duration(result) {
      return result.balanced ? '目前收支可平衡' : `預估可支應 ${number(result.months)} 個月`;
    }

    function announce(message) {
      clearTimeout(announceTimer);
      announceTimer = setTimeout(() => {
        const live = mount.querySelector('[data-cf-live]');
        if (live) live.textContent = message;
      }, 180);
    }

    function field(key) {
      const config = FIELDS[key];
      const error = state.errors[key];
      const value = Object.hasOwn(state.drafts, key) ? state.drafts[key] : String(state[key]);
      return `<div class="cf-demo-field" data-cf-field-wrap="${key}">
        <label class="cf-demo-field-label" for="cf-demo-${key}">${config.label}</label>
        <div class="cf-demo-input-wrap"><input id="cf-demo-${key}" class="cf-demo-input" data-cf-field="${key}" type="text" inputmode="numeric" autocomplete="off" spellcheck="false" value="${escape(value)}" aria-describedby="cf-demo-${key}-unit cf-demo-${key}-error" aria-invalid="${Boolean(error)}"><span class="cf-demo-unit" id="cf-demo-${key}-unit">${config.unit}</span></div>
        <div class="cf-demo-field-error" id="cf-demo-${key}-error" ${error ? '' : 'hidden'}><span>${escape(error || '')}</span> <button class="cf-demo-restore" type="button" data-cf-restore="${key}">還原此欄</button></div>
      </div>`;
    }

    function resultPanel() {
      const result = calculate();
      return `<aside class="cf-demo-result" aria-label="即時試算結果">
        <div class="cf-demo-eyebrow">你的安排，即時看見</div>
        <div class="cf-demo-result-title">預估支應期間</div>
        <div data-cf-result-number>${resultNumber(result)}</div>
        <div class="cf-demo-result-caption" data-cf-result-caption>${result.balanced ? '依目前固定收支，不需動用試算資金。' : '以目前試算資金，支應每月資金缺口。'}</div>
        <dl class="cf-demo-ledger">
          <div><dt>每月總支出</dt><dd data-cf-total>${number(result.totalMonthlyExpense)} 元</dd></div>
          <div><dt>已確認每月收入</dt><dd data-cf-income>${number(state.income)} 元</dd></div>
          <div class="cf-demo-ledger-total"><dt>每月資金缺口</dt><dd data-cf-gap>${number(result.monthlyShortfall)} 元</dd></div>
        </dl>
        <div class="cf-demo-result-note">固定收支簡化示範，非完整動態模型。未確認給付未計入收入。</div>
      </aside>`;
    }

    function resultNumber(result) {
      return result.balanced
        ? '<div class="cf-demo-balanced">目前收支<br>可平衡</div>'
        : `<div class="cf-demo-number ${String(result.months).length > 5 ? 'cf-demo-number-long' : ''}">${number(result.months)}<span>個月</span></div>`;
    }

    function stepBody() {
      if (state.step === 0) return `<div class="cf-demo-operation cf-demo-operation-split">
        <div><p class="cf-demo-eyebrow">01 / 先從生活的改變開始</p><h3 class="cf-demo-heading">接下來，<br>怎麼照顧自己？</h3><p class="cf-demo-copy">選擇照護方式，先帶入示範費用；下一步可依你的情境調整。</p>
        <div class="cf-demo-care-options" role="group" aria-label="選擇照護方式">${Object.entries(CARE).map(([key, item]) => `<button type="button" class="cf-demo-care-option ${state.careType === key ? 'cf-demo-care-option-selected' : ''}" data-cf-care="${key}" aria-pressed="${state.careType === key}"><span class="cf-demo-care-index">${item.icon}</span><span><strong>${item.label}</strong><small>${item.description}</small></span><span class="cf-demo-care-indicator" aria-hidden="true">${state.careType === key ? '✓' : '↗'}</span></button>`).join('')}</div>
        <p class="cf-demo-soft-note">目前選擇：${CARE[state.careType].label}，暫以 ${number(state.careCost)} 元／月試算。</p></div>${resultPanel()}</div>`;

      if (state.step === 1) return `<div class="cf-demo-operation cf-demo-operation-split"><div><p class="cf-demo-eyebrow">02 / 把每月的安排看清楚</p><h3 class="cf-demo-heading">一筆費用，<br>看見不同的未來。</h3><p class="cf-demo-copy">修改下列合成數字，右側會立即更新。其他生活費不含照護費；請勿輸入真實個人資料。</p><div class="cf-demo-fields">${['funds', 'income', 'living', 'careCost'].map(field).join('')}</div></div>${resultPanel()}</div>`;

      if (state.step === 2) return `<div class="cf-demo-operation cf-demo-operation-split"><div><p class="cf-demo-eyebrow">03 / 把未知，和確定分開</p><h3 class="cf-demo-heading">可能有給付，<br>先別當成收入。</h3><p class="cf-demo-copy">來源：合成保單摘要，示範版本 01。金額、頻率與給付條件均待專員核對。</p><section class="cf-demo-benefit"><div class="cf-demo-benefit-top"><span class="cf-demo-tag">未確認</span><span class="cf-demo-benefit-label">示範保單給付摘要</span></div><div class="cf-demo-benefit-amount">10,000<span>元／月</span></div><p>暫未計入本次每月收入</p><button type="button" class="cf-demo-text-button" data-cf-action="benefit" aria-expanded="${state.benefitExpanded}" aria-controls="cf-demo-benefit-details">${state.benefitExpanded ? '收起說明 −' : '查看未確認原因 ＋'}</button><div class="cf-demo-benefit-details" id="cf-demo-benefit-details" ${state.benefitExpanded ? '' : 'hidden'}>本卡是預設合成內容，未讀取真實保單，也未執行 AI 擷取或來源驗證。正式資料須保留來源與日期，並核對給付條件、期間及資格。這項未確認給付不會加入試算。</div></section><p class="cf-demo-soft-note">目前試算只採已確認每月收入 <strong>${number(state.income)} 元</strong>。</p></div>${resultPanel()}</div>`;

      if (state.step === 3) return `<div class="cf-demo-operation"><p class="cf-demo-eyebrow">04 / 試著多想一步</p><div class="cf-demo-comparison-heading"><div><h3 class="cf-demo-heading">如果費用改變，<br>安排撐得住嗎？</h3><p class="cf-demo-copy">只改變照護費，其他假設保持相同。比較結果協助你和專員討論。</p></div><div class="cf-demo-comparison-input">${field('comparisonCost')}</div></div><div class="cf-demo-comparison-summary" data-cf-comparison-summary>${comparisonSummary()}</div><div class="cf-demo-chart-wrap" data-cf-chart>${chart()}</div><p class="cf-demo-soft-note">橫軸：經過月數。縱軸：試算資金餘額（萬元）。未確認給付不計入兩個情境。</p></div>`;

      const result = calculate();
      const hasErrors = Object.keys(state.errors).length > 0;
      return `<div class="cf-demo-operation cf-demo-operation-split"><div><p class="cf-demo-eyebrow">05 / 下一步，有人一起確認</p><h3 class="cf-demo-heading">把你的安排，<br>帶進下一次對話。</h3><p class="cf-demo-copy">由你確認摘要，再交由規則檢核與專員覆核。正式流程須先核對關鍵欄位再重算；本頁不會調整信託給付。</p><dl class="cf-demo-review-list"><div><dt>照護方式</dt><dd>${CARE[state.careType].label}</dd></div><div><dt>每月照護費</dt><dd>${number(state.careCost)} 元</dd></div><div><dt>預估支應期間</dt><dd>${result.balanced ? '目前收支可平衡' : `${number(result.months)} 個月`}</dd></div><div><dt>未確認給付</dt><dd>10,000 元／月，未計入</dd></div></dl>
        <div class="cf-demo-submit-state ${state.submitted ? 'cf-demo-submit-state-sent' : ''}" data-cf-submit-state>${state.submitted ? '<span class="cf-demo-status-dot" aria-hidden="true"></span>專員確認中（示範）' : '尚未送出（示範）'}</div>
        ${hasErrors ? '<p class="cf-demo-submit-error">有欄位尚未修正。試算暫保留上一筆有效數值。</p><button type="button" class="cf-demo-text-button" data-cf-action="fix-errors">前往修正欄位 →</button>' : ''}
        <button type="button" class="cf-demo-button cf-demo-button-primary cf-demo-submit" data-cf-action="submit" ${state.submitted || hasErrors ? 'disabled' : ''}>${state.submitted ? '已完成本機示範' : '確認並模擬送交專員'}<span aria-hidden="true">↗</span></button><p class="cf-demo-local-note">這是本機互動示範，資料未傳送給銀行、專員或其他人。</p></div>${resultPanel()}</div>`;
    }

    function comparisonSummary() {
      const a = calculate();
      const b = calculate(state.comparisonCost);
      return `<div class="cf-demo-comparison-item"><div class="cf-demo-series-label"><i class="cf-demo-series-a" aria-hidden="true"></i>A · 目前安排</div><strong>${a.balanced ? '收支可平衡' : `${number(a.months)}<span> 個月</span>`}</strong><small>照護費 ${number(state.careCost)} 元／月 · 缺口 ${number(a.monthlyShortfall)} 元／月</small></div><div class="cf-demo-comparison-item"><div class="cf-demo-series-label"><i class="cf-demo-series-b" aria-hidden="true"></i>B · 自訂情境</div><strong>${b.balanced ? '收支可平衡' : `${number(b.months)}<span> 個月</span>`}</strong><small>照護費 ${number(state.comparisonCost)} 元／月 · 缺口 ${number(b.monthlyShortfall)} 元／月</small></div>`;
    }

    function chart() {
      const a = calculate();
      const b = calculate(state.comparisonCost);
      const finite = [a.months, b.months].filter(value => value !== null && value > 0);
      const horizon = finite.length ? Math.max(12, ...finite) : 120;
      const netA = a.totalMonthlyExpense - state.income;
      const netB = b.totalMonthlyExpense - state.income;
      const yMax = Math.max(1, state.funds, state.funds - netA * horizon, state.funds - netB * horizon) * 1.05;
      const x0 = 65, x1 = 748, y0 = 28, y1 = 244;
      const x = month => x0 + (month / horizon) * (x1 - x0);
      const y = balance => y1 - (balance / yMax) * (y1 - y0);
      const points = net => {
        const ticks = Array.from({ length: 25 }, (_, i) => horizon * i / 24);
        if (net > 0 && state.funds / net < horizon) ticks.push(state.funds / net);
        return ticks.sort((u, v) => u - v).map(month => `${x(month).toFixed(2)},${y(Math.max(0, state.funds - net * month)).toFixed(2)}`).join(' ');
      };
      const grid = Array.from({ length: 4 }, (_, i) => {
        const amount = yMax * i / 3;
        return `<line x1="${x0}" y1="${y(amount)}" x2="${x1}" y2="${y(amount)}" class="cf-demo-chart-grid"/><text x="${x0 - 12}" y="${y(amount) + 4}" text-anchor="end">${new Intl.NumberFormat('zh-TW', { maximumFractionDigits: 1 }).format(amount / 10000)}</text>`;
      }).join('');
      const ticks = Array.from({ length: 5 }, (_, i) => { const month = horizon * i / 4; return `<text x="${x(month)}" y="${y1 + 25}" text-anchor="middle">${number(month)}</text>`; }).join('');
      return `<svg class="cf-demo-chart" viewBox="0 0 800 300" role="img" aria-label="資金餘額比較。A目前安排：${duration(a)}；B自訂情境：${duration(b)}。橫軸月數，縱軸萬元。"><title>目前安排與自訂情境的資金餘額</title>${grid}${ticks}<polyline class="cf-demo-chart-line cf-demo-chart-line-a" points="${points(netA)}"/><polyline class="cf-demo-chart-line cf-demo-chart-line-b" points="${points(netB)}"/><circle cx="${x0}" cy="${y(state.funds)}" r="4" class="cf-demo-chart-dot"/><text x="${x1}" y="291" text-anchor="end">月</text><text x="${x0}" y="15">萬元</text></svg>`;
    }

    function render() {
      const invalid = Object.keys(state.errors).length > 0;
      mount.innerHTML = `<section class="cf-demo" aria-label="CareFlow 個人端互動示範"><div class="cf-demo-topbar"><div class="cf-demo-brand"><span class="cf-demo-brand-icon" aria-hidden="true">c<span>f</span></span><span>我的照護安排</span></div><button type="button" class="cf-demo-reset" data-cf-action="reset">重設示範 <span aria-hidden="true">↺</span></button></div><div class="cf-demo-body"><aside class="cf-demo-sidebar"><p class="cf-demo-sidebar-kicker">YOUR NEXT CHAPTER</p><p class="cf-demo-sidebar-title">照護變了，<br>安排也能跟著更新。</p><div class="cf-demo-tabs" role="tablist" aria-label="照護安排步驟" aria-orientation="vertical">${STEPS.map((label, index) => `<button type="button" role="tab" id="cf-demo-tab-${index}" class="cf-demo-tab ${index === state.step ? 'cf-demo-tab-active' : ''}" aria-selected="${index === state.step}" aria-controls="cf-demo-panel" tabindex="${index === state.step ? '0' : '-1'}" data-cf-step="${index}"><span class="cf-demo-step-number">0${index + 1}</span><span>${label}</span><span class="cf-demo-step-arrow" aria-hidden="true">↗</span></button>`).join('')}</div><div class="cf-demo-sidebar-note"><span class="cf-demo-sidebar-dot" aria-hidden="true"></span>只改變情境，<br>不執行給付或交易。</div></aside><div class="cf-demo-main" role="tabpanel" id="cf-demo-panel" aria-labelledby="cf-demo-tab-${state.step}" tabindex="0">${stepBody()}<div class="cf-demo-footer"><span class="cf-demo-progress">0${state.step + 1} <span>/ 05</span></span><div class="cf-demo-footer-buttons">${state.step > 0 ? '<button type="button" class="cf-demo-button cf-demo-button-quiet" data-cf-action="previous">← 上一步</button>' : ''}${state.step < 4 ? `<button type="button" class="cf-demo-button cf-demo-button-primary" data-cf-action="next">下一步<span aria-hidden="true">→</span></button>` : ''}</div></div>${invalid && state.step !== 1 && state.step !== 3 && state.step !== 4 ? '<div class="cf-demo-global-error">有欄位待修正，試算暫保留上一筆有效數值。</div>' : ''}</div></div><div class="cf-demo-disclaimer"><strong>合成情境示範</strong><span>固定收支簡化示範，不計利息、通膨、投資波動與相關費用；非完整動態信託模型。</span></div><div class="cf-demo-sr-only" data-cf-live aria-live="polite" aria-atomic="true"></div></section>`;
    }

    function updateDerived() {
      const result = calculate();
      const replace = (selector, content, html = false) => mount.querySelectorAll(selector).forEach(node => { if (html) node.innerHTML = content; else node.textContent = content; });
      replace('[data-cf-result-number]', resultNumber(result), true);
      replace('[data-cf-result-caption]', result.balanced ? '依目前固定收支，不需動用試算資金。' : '以目前試算資金，支應每月資金缺口。');
      replace('[data-cf-total]', `${number(result.totalMonthlyExpense)} 元`);
      replace('[data-cf-income]', `${number(state.income)} 元`);
      replace('[data-cf-gap]', `${number(result.monthlyShortfall)} 元`);
      replace('[data-cf-comparison-summary]', comparisonSummary(), true);
      replace('[data-cf-chart]', chart(), true);
      announce(`${duration(result)}。每月資金缺口 ${number(result.monthlyShortfall)} 元。`);
    }

    function validate(key, raw) {
      const cleaned = raw.trim().replace(/,/g, '');
      if (!cleaned) return '請輸入金額；沒有支出或收入時可填 0。';
      if (!/^\d+$/.test(cleaned) || !Number.isFinite(Number(cleaned))) return '請輸入 0 以上的整數金額。';
      if (Number(cleaned) > FIELDS[key].max) return `示範範圍上限為 ${number(FIELDS[key].max)} 元。`;
      return null;
    }

    function setStep(step, focus = true) {
      state.step = Math.max(0, Math.min(4, step));
      render();
      if (focus) mount.querySelector(`#cf-demo-tab-${state.step}`).focus({ preventScroll: true });
    }

    mount.addEventListener('input', event => {
      const input = event.target.closest('[data-cf-field]');
      if (!input) return;
      const key = input.dataset.cfField;
      const raw = input.value;
      const error = validate(key, raw);
      state.drafts[key] = raw;
      state.submitted = false;
      if (error) state.errors[key] = error;
      else { delete state.errors[key]; state[key] = Number(raw.trim().replace(/,/g, '')); }
      input.setAttribute('aria-invalid', String(Boolean(error)));
      const message = mount.querySelector(`#cf-demo-${key}-error`);
      message.hidden = !error;
      message.querySelector('span').textContent = error || '';
      if (!error) updateDerived();
      else announce(error);
    });

    mount.addEventListener('click', event => {
      const control = event.target.closest('button');
      if (!control || !mount.contains(control) || control.disabled) return;
      if (control.dataset.cfStep !== undefined) return setStep(Number(control.dataset.cfStep));
      if (control.dataset.cfCare) {
        const key = control.dataset.cfCare;
        state.careType = key;
        state.careCost = CARE[key].cost;
        delete state.drafts.careCost;
        delete state.errors.careCost;
        state.submitted = false;
        render();
        mount.querySelector(`[data-cf-care="${key}"]`).focus({ preventScroll: true });
        return announce(`已選擇${CARE[key].label}，以每月照護費 ${number(state.careCost)} 元試算。${duration(calculate())}。`);
      }
      if (control.dataset.cfRestore) {
        const key = control.dataset.cfRestore;
        delete state.drafts[key];
        delete state.errors[key];
        render();
        mount.querySelector(`#cf-demo-${key}`).focus({ preventScroll: true });
        return announce('已還原上一筆有效金額。');
      }
      switch (control.dataset.cfAction) {
        case 'next': return setStep(state.step + 1);
        case 'previous': return setStep(state.step - 1);
        case 'reset': state = initial(); render(); return announce('已重設為合成示範資料。');
        case 'benefit': state.benefitExpanded = !state.benefitExpanded; render(); mount.querySelector('[data-cf-action="benefit"]').focus({ preventScroll: true }); return;
        case 'fix-errors': return setStep(Object.keys(state.errors).some(key => key !== 'comparisonCost') ? 1 : 3);
        case 'submit':
          if (Object.keys(state.errors).length) return;
          state.submitted = true;
          render();
          mount.querySelector('[data-cf-submit-state]').setAttribute('tabindex', '-1');
          mount.querySelector('[data-cf-submit-state]').focus({ preventScroll: true });
          return announce('專員確認中，僅本機示範。資料沒有傳送給任何人。');
      }
    });

    mount.addEventListener('keydown', event => {
      const tab = event.target.closest('[data-cf-step]');
      if (!tab) return;
      let next;
      if (event.key === 'ArrowDown' || event.key === 'ArrowRight') next = (state.step + 1) % 5;
      if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') next = (state.step + 4) % 5;
      if (event.key === 'Home') next = 0;
      if (event.key === 'End') next = 4;
      if (next !== undefined) { event.preventDefault(); setStep(next); }
    });

    window.CareFlowDemo = {
      reset() { state = initial(); render(); return this.getState(); },
      goToStep(index) {
        const next = Number(index);
        if (Number.isInteger(next) && next >= 0 && next <= 4) setStep(next);
        return window.CareFlowDemo.getState();
      },
      getState() {
        return JSON.parse(JSON.stringify({
          step: state.step + 1,
          careType: state.careType,
          funds: state.funds,
          monthlyIncome: state.income,
          otherMonthlyExpenses: state.living,
          monthlyCareCost: state.careCost,
          comparisonMonthlyCareCost: state.comparisonCost,
          benefitMonthlyAmount: 10000,
          benefitIncluded: false,
          result: calculate(),
          comparison: calculate(state.comparisonCost),
          submitted: state.submitted,
          submissionStatus: state.submitted ? '專員確認中（示範）' : '尚未送出（示範）',
          errors: state.errors,
          storage: 'memory-only',
          dataSent: false
        }));
      }
    };
    render();
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();
