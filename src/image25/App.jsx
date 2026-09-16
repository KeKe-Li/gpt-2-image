import React, { useEffect, useRef, useState } from 'react';
import { ArrowRight, ArrowUpRight, Check, ChevronDown, ChevronsLeftRight, Columns2, Copy, Expand, Info, Settings2, Sun, WandSparkles, X, Zap } from 'lucide-react';
import { comparisonCases, modelDocs } from './cases';
import hero from '../assets/image25-hero.png';

const text = {
  zh: {
    brand: 'GPT-Image2 画廊', cases: '案例', zone: '2.5 专区', templates: '模板', back: '返回画廊',
    headline: '同一提示词，从细节看变化。',
    sunburstIntro: 'Sunburst：精细生成与编辑，适合注重编辑准确性的创作场景。',
    flareIntro: 'Flare：快速日常生成，适合日常图片创作与灵感探索。',
    compare: '查看对比', official: '官方介绍', slogan: ['更生动的想象', '在此展开。'], subSlogan: ['同一个想法，', '看见更多可能。'],
    demoNotice: '界面示意 · 对比图片非实测', demo: '示意图',
    demoExplanation: '本组两侧共用同一张示意图，仅用于体验对比交互。',
    testNotice: '真实案例复现 · 站内完整 Prompt', original: '图库原图', generated: '本次生成',
    testExplanation: '复用站内完整提示词，未输入参考图；原图生成条件未知，此处仅展示单次复现。',
    thisRun: '本次生成记录', completed: '已完成 · 单次生成', testHelp: '独立构图，建议并排查看',
    shared: '共享 Prompt', copy: '复制 Prompt', copied: '已复制', copyFailed: '复制失败，请选中上方文字手动复制。',
    choose: '选择 2.5 型号', sunburst: '精细生成与编辑', flare: '快速日常生成', params: '查看生成参数',
    next: '下一组', chooseCase: '选择对比案例', sideBySide: '并排', slider: '滑动', sliderHelp: '构图接近时，适合滑动对照',
    sliderLabel: '调整对比图片分界位置', enlarge: '放大查看', close: '关闭', viewDetails: '查看详情',
    source: '图片来源', focus: '观察重点', status: '对比状态', pending: '待实测',
    model: '计划对比型号', settings: '尺寸、质量、耗时与成本', notRecorded: '实测完成后公开',
    methodology: '实测将使用完全相同的 Prompt 与输入素材，分别记录模型、尺寸、质量设置和多次生成结果。相同质量名称可能对应不同计算量，请结合实际成本阅读。',
    modelDetails: '查看所选型号官方文档', promptLabel: '本组完整提示词',
    footer: 'GPT Image 2.5 专区', footerNote: '官方信息与实测结果分别标注，原案例库持续保留。',
    docsDate: '官方文档核对：2026-09-09', sample: '示意素材', skip: '跳到图片对比'
  },
  en: {
    brand: 'GPT-Image2 Gallery', cases: 'Cases', zone: 'Image 2.5', templates: 'Templates', back: 'Back to gallery',
    headline: 'Same prompt. See the details.',
    sunburstIntro: 'Sunburst: image generation and editing for workflows where editing precision matters most.',
    flareIntro: 'Flare: fast, high-quality everyday image generation and creative exploration.',
    compare: 'Explore comparison', official: 'Official guide', slogan: ['More vivid ideas', 'start here.'], subSlogan: ['One shared idea.', 'More possibilities.'],
    demoNotice: 'Interface demo · Images are not benchmark results', demo: 'Illustration',
    demoExplanation: 'This example uses the same illustration in both panels to demonstrate the controls.',
    testNotice: 'Real case recreation · Full gallery prompt', original: 'Gallery original', generated: 'New generation',
    testExplanation: 'The full gallery prompt was reused without a reference image. Original generation conditions are unknown; this is one recreation.',
    thisRun: 'Generation record', completed: 'Completed · One generation', testHelp: 'Different compositions: try side by side',
    shared: 'Shared prompt', copy: 'Copy prompt', copied: 'Copied', copyFailed: 'Copy failed. Select the prompt above and copy it manually.',
    choose: 'Choose a 2.5 model', sunburst: 'Precise generation & editing', flare: 'Fast everyday generation', params: 'View generation settings',
    next: 'Next example', chooseCase: 'Choose a comparison case', sideBySide: 'Side by side', slider: 'Slider', sliderHelp: 'Best for images with similar compositions',
    sliderLabel: 'Adjust image comparison divider', enlarge: 'Enlarge images', close: 'Close', viewDetails: 'View details',
    source: 'Image source', focus: 'Look closely at', status: 'Comparison status', pending: 'Awaiting real tests',
    model: 'Planned model comparison', settings: 'Size, quality, latency & cost', notRecorded: 'Published with the real tests',
    methodology: 'Tests will use the exact same prompt and input images, with model, size, quality, and repeated outputs recorded. The same quality name can use different compute; compare actual costs too.',
    modelDetails: 'Read the selected model documentation', promptLabel: 'Complete shared prompt',
    footer: 'GPT Image 2.5', footerNote: 'Official information and test results are labeled separately. The existing gallery remains available.',
    docsDate: 'Official docs checked: 2026-09-09', sample: 'Illustration', skip: 'Skip to comparison'
  }
};

function initialState() {
  const params = new URLSearchParams(window.location.search);
  return { language: params.get('lang') === 'en' ? 'en' : 'zh', caseIndex: Math.max(0, comparisonCases.findIndex(item => item.id === params.get('case'))) };
}

export default function App() {
  const [initial] = useState(initialState);
  const [language, setLanguage] = useState(initial.language);
  const [caseIndex, setCaseIndex] = useState(initial.caseIndex);
  const [model, setModel] = useState('sunburst');
  const [view, setView] = useState(comparisonCases[initial.caseIndex].result ? 'side' : 'slider');
  const [position, setPosition] = useState(50);
  const [copyState, setCopyState] = useState('');
  const [modal, setModal] = useState(null);
  const dialogRef = useRef(null);
  const copyTimer = useRef(null);
  const t = text[language];
  const item = comparisonCases[caseIndex];
  const modelName = model === 'sunburst' ? 'Sunburst' : 'Flare';
  const result = item.result;
  const notice = result ? t.testNotice : t.demoNotice;
  const explanation = result ? t.testExplanation : t.demoExplanation;
  const beforeLabel = 'GPT 2.0';
  const afterLabel = result ? result.label[language] : `GPT 2.5 · ${modelName}`;
  const sourceCaseId = result?.caseId || item.sourceCaseId;

  useEffect(() => {
    document.documentElement.lang = language === 'zh' ? 'zh-CN' : 'en';
    document.title = language === 'zh' ? 'GPT Image 2.5 专区 · 同提示词对比 | GPT-Image2 Gallery' : 'GPT Image 2.5 · Same-prompt comparison | GPT-Image2 Gallery';
    const url = new URL(window.location.href);
    if (language === 'en') url.searchParams.set('lang', 'en'); else url.searchParams.delete('lang');
    if (caseIndex) url.searchParams.set('case', item.id); else url.searchParams.delete('case');
    window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
  }, [language, caseIndex, item.id]);

  useEffect(() => {
    if (!modal) return undefined;
    const dialog = dialogRef.current;
    const overflow = document.body.style.overflow;
    dialog.showModal();
    document.body.style.overflow = 'hidden';
    return () => { dialog.close(); document.body.style.overflow = overflow; };
  }, [modal]);

  useEffect(() => () => clearTimeout(copyTimer.current), []);

  async function copyPrompt() {
    clearTimeout(copyTimer.current);
    try { await navigator.clipboard.writeText(item.prompt); setCopyState('copied'); }
    catch { setCopyState('failed'); }
    copyTimer.current = setTimeout(() => setCopyState(''), 2500);
  }

  function selectCase(nextIndex) {
    if (nextIndex < 0 || nextIndex >= comparisonCases.length) return;
    setCaseIndex(nextIndex);
    setView(comparisonCases[nextIndex].result ? 'side' : 'slider');
    setPosition(50);
    setCopyState('');
    clearTimeout(copyTimer.current);
  }

  function nextCase() {
    selectCase((caseIndex + 1) % comparisonCases.length);
  }

  function picture(label, side) {
    const generated = result && side === 'after';
    return <figure className={`image25-picture image25-picture-${side}`}>
      <img src={generated ? result.image : item.image} alt={generated ? result.alt[language] : item.alt[language]} draggable="false" />
      <figcaption className="image25-model-label">{label}</figcaption>
      {side === 'before' && sourceCaseId ? <a className="image25-demo-label image25-detail-link" href={`/?case=${sourceCaseId}`}>{t.viewDetails}<ArrowUpRight size={14} /></a> : <span className="image25-demo-label">{result ? (generated ? t.generated : t.original) : t.demo}</span>}
    </figure>;
  }

  return <div className="image25-page">
    <a className="image25-skip" href="#comparison">{t.skip}</a>
    <header className="image25-header">
      <a className="image25-brand" href="/"><WandSparkles size={23} />{t.brand}</a>
      <nav aria-label={language === 'zh' ? '主导航' : 'Main navigation'}>
        <a href="/#gallery">{t.cases}</a>
        <a href="/gpt-image-2-5/" aria-current="page">{t.zone}</a>
        <a href="/#templates">{t.templates}</a>
        <a href="https://github.com/KeKe-Li/gpt-2-image" target="_blank" rel="noreferrer">GitHub</a>
      </nav>
      <div className="image25-header-actions">
        <label className="image25-language"><span className="image25-sr-only">Language / 语言</span><select value={language} onChange={event => setLanguage(event.target.value)}><option value="zh">中文</option><option value="en">EN</option></select><ChevronDown size={14} /></label>
        <a className="image25-button image25-back" href="/">{t.back}<ArrowRight size={18} /></a>
      </div>
    </header>

    <main>
      <section className="image25-hero" aria-labelledby="image25-title">
        <div className="image25-hero-copy">
          <h1 id="image25-title">GPT Image 2.5</h1>
          <h2>{t.headline}</h2>
          <div className="image25-intro"><p>{t.sunburstIntro}</p><p>{t.flareIntro}</p></div>
          <div className="image25-hero-actions"><a className="image25-button" href="#comparison">{t.compare}<ArrowRight size={20} /></a><a className="image25-doc-link" href={modelDocs.guide} target="_blank" rel="noreferrer">{t.official}<ArrowUpRight size={17} /></a></div>
        </div>
        <div className="image25-hero-art" aria-hidden="true"><img src={hero} alt="" /><div><p>{t.slogan[0]}<br />{t.slogan[1]}</p><span>{t.subSlogan[0]}<br />{t.subSlogan[1]}</span></div></div>
      </section>

      <section className="image25-workspace" id="comparison" aria-label={t.compare}>
        <div className="image25-comparison-panel">
          <div className="image25-notice"><span><Info size={15} />{notice}</span><button type="button" className="image25-icon-button" onClick={() => setModal('images')} aria-label={t.enlarge} title={t.enlarge}><Expand size={17} /></button></div>
          <div className={`image25-canvas image25-canvas-${view}${result ? ' image25-canvas-real' : ''}`} style={{ '--split': `${position}%` }}>
            {picture(beforeLabel, 'before')}
            {picture(afterLabel, 'after')}
            {view === 'slider' && <>
              <div className="image25-divider" aria-hidden="true"><span><ChevronsLeftRight size={24} /></span></div>
              <input className="image25-range" aria-label={t.sliderLabel} aria-valuetext={`${position}%`} type="range" min="0" max="100" value={position} onChange={event => setPosition(Number(event.target.value))} />
            </>}
          </div>
          <div className="image25-comparison-controls"><div className="image25-view-switch" role="group" aria-label={language === 'zh' ? '对比方式' : 'Comparison layout'}><button type="button" aria-pressed={view === 'side'} onClick={() => setView('side')}><Columns2 size={17} />{t.sideBySide}</button><button type="button" aria-pressed={view === 'slider'} onClick={() => setView('slider')}><ChevronsLeftRight size={17} />{t.slider}</button></div><p><Info size={16} />{result ? t.testHelp : t.sliderHelp}</p></div>
        </div>

        <aside className="image25-prompt-panel" aria-label={t.shared}>
          <div className="image25-prompt-heading"><h3>{t.shared}</h3><Copy size={17} /></div>
          <textarea aria-label={t.promptLabel} readOnly value={item.prompt} spellCheck={false} />
          <button type="button" className="image25-copy" onClick={copyPrompt}>{copyState === 'copied' ? <Check size={17} /> : <Copy size={17} />}{copyState === 'copied' ? t.copied : t.copy}</button>
          <span className="image25-copy-status" role="status">{copyState === 'failed' ? t.copyFailed : copyState === 'copied' ? t.copied : ''}</span>
          {result ? <section className="image25-result-info" aria-label={t.thisRun}><h3>{t.thisRun}</h3><p className="image25-result-status"><Check size={17} />{t.completed}</p><p>{result.summary[language]}</p><small>{result.modelNote[language]}</small></section> : <fieldset className="image25-models"><legend>{t.choose}</legend>{['sunburst', 'flare'].map(value => <label key={value} className="image25-model-option"><input type="radio" name="image25-model" value={value} checked={model === value} onChange={() => setModel(value)} />{value === 'sunburst' ? <Sun size={34} /> : <Zap size={34} />}<span><strong>{value === 'sunburst' ? 'Sunburst' : 'Flare'}</strong><small>{t[value]}</small></span></label>)}</fieldset>}
          <button type="button" className="image25-parameters" onClick={() => setModal('params')}><Settings2 size={19} />{t.params}<ArrowUpRight size={15} /></button>
          <div className="image25-next"><select className="image25-case-select" aria-label={t.chooseCase} value={item.id} onChange={event => selectCase(comparisonCases.findIndex(entry => entry.id === event.target.value))}>{comparisonCases.map((entry, index) => <option key={entry.id} value={entry.id}>{String(index + 1).padStart(2, '0')} / {String(comparisonCases.length).padStart(2, '0')} · {entry.title[language]}{entry.result ? '' : ` · ${t.demo}`}</option>)}</select><button className="image25-button" type="button" onClick={nextCase}>{t.next}<ArrowRight size={19} /></button></div>
        </aside>
      </section>

      <div className="image25-context"><p><Info size={16} />{explanation}</p><p>{t.focus}：{item.focus[language]}</p>{item.sourceUrl ? <a href={item.sourceUrl} target="_blank" rel="noreferrer">{t.source}：{item.source[language]}<ArrowUpRight size={14} /></a> : <span>{t.source}：{item.source[language]}</span>}</div>
    </main>
    <footer className="image25-footer"><div><WandSparkles size={19} /><strong>{t.footer}</strong><span>{t.docsDate}</span></div><p>{t.footerNote}</p><a href="/">{t.back}<ArrowRight size={15} /></a></footer>

    <dialog className={`image25-dialog ${modal === 'images' ? 'image25-dialog-images' : ''}`} ref={dialogRef} aria-labelledby="image25-dialog-title" onCancel={() => setModal(null)} onClick={event => { if (event.target === event.currentTarget) setModal(null); }}>
      <div className="image25-dialog-inner"><header><h2 id="image25-dialog-title">{modal === 'images' ? item.title[language] : t.params}</h2><button autoFocus type="button" className="image25-icon-button" onClick={() => setModal(null)} aria-label={t.close}><X size={23} /></button></header>
        {modal === 'images' ? <><p className="image25-modal-notice">{notice}</p><div className="image25-enlarged">{picture(beforeLabel, 'before')}{picture(afterLabel, 'after')}</div></> : result ? <>
          <p className="image25-modal-notice">{explanation}</p><dl>{result.parameters[language].map(row => <div key={row.label}><dt>{row.label}</dt><dd>{row.value}</dd></div>)}</dl><p className="image25-methodology">{result.modelNote[language]}</p>
        </> : <>
          <p className="image25-modal-notice">{t.demoExplanation}</p><dl><div><dt>{t.status}</dt><dd>{t.pending}</dd></div><div><dt>{t.model}</dt><dd>gpt-image-2<br />gpt-image-2.5-{model}</dd></div><div><dt>{t.settings}</dt><dd>{t.notRecorded}</dd></div><div><dt>{t.source}</dt><dd>{item.source[language]}</dd></div></dl><p className="image25-methodology">{t.methodology}</p><a className="image25-doc-link" href={modelDocs[model]} target="_blank" rel="noreferrer">{t.modelDetails}<ArrowUpRight size={16} /></a>
        </>}
      </div>
    </dialog>
  </div>;
}
