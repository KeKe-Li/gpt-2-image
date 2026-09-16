import rioImage from '../assets/image25-case527-run1.png';
import watercolorImage from '../assets/image25-case523-run1.png';
import iconImage from '../assets/image25-case510-run1.png';
import rioInput from '../../docs/design/gpt-image-2-5/case527-test-input.json';
import watercolorInput from '../../docs/design/gpt-image-2-5/case523-test-input.json';
import iconInput from '../../docs/design/gpt-image-2-5/case510-test-input.json';
import rioRecord from '../../docs/design/gpt-image-2-5/case527-test-record.json';
import watercolorRecord from '../../docs/design/gpt-image-2-5/case523-test-record.json';
import iconRecord from '../../docs/design/gpt-image-2-5/case510-test-record.json';

function recreation(input, record, image, content) {
  const dimensions = value => `${value.width} × ${value.height}`;
  return {
    id: `gallery-${input.caseId}-test`,
    title: content.title,
    prompt: input.prompt,
    image: `/images/case${input.caseId}.jpg`,
    alt: { zh: `图库原图：${input.title}`, en: `Gallery original: ${content.title.en}` },
    source: { zh: `案例 #${input.caseId} · ${content.sourceLabel}`, en: `Case #${input.caseId} · ${content.sourceLabel}` },
    sourceUrl: input.source,
    focus: content.focus,
    result: {
      caseId: input.caseId,
      image,
      label: { zh: 'GPT 2.5', en: 'GPT 2.5' },
      alt: { zh: `本次生成：${input.title}`, en: `New generation: ${content.title.en}` },
      summary: content.summary,
      modelNote: {
        zh: '本次使用 Codex 内置生图。工具未返回具体型号、质量档位或费用。',
        en: 'Generated with the built-in Codex image tool. The exact model, quality setting and cost were not returned.'
      },
      parameters: {
        zh: [
          { label: '生成日期', value: record.date },
          { label: '输入', value: `站内案例 #${input.caseId} 完整 Prompt；未改写；无参考图` },
          { label: '样本', value: '首次生成 1 张；保留原始结果' },
          { label: '原图尺寸', value: dimensions(record.sourceDimensions) },
          { label: '本次输出', value: dimensions(record.outputDimensions) },
          { label: '调用等待', value: `约 ${record.approximateCallWallClockSeconds} 秒（含队列与传输）` },
          { label: '模型与质量档位', value: 'Codex 内置生图；具体 ID 与档位未返回' },
          { label: '费用', value: '工具未返回' },
          { label: '原图生成条件', value: '来源为站内案例；原始模型 ID、输入与设置未独立核验' }
        ],
        en: [
          { label: 'Date', value: record.date },
          { label: 'Input', value: `Full case #${input.caseId} gallery prompt; unchanged; no reference image` },
          { label: 'Sample', value: 'One first-run image; original output retained' },
          { label: 'Original size', value: dimensions(record.sourceDimensions) },
          { label: 'New output', value: dimensions(record.outputDimensions) },
          { label: 'Call wait', value: `About ${record.approximateCallWallClockSeconds} s, including queueing and transfer` },
          { label: 'Model and quality', value: 'Built-in Codex image tool; exact ID and quality not returned' },
          { label: 'Cost', value: 'Not returned' },
          { label: 'Original conditions', value: 'Existing gallery case; original model ID, inputs and settings not independently verified' }
        ]
      }
    }
  };
}

export const additionalCases = [
  recreation(rioInput, rioRecord, rioImage, {
    title: { zh: '里约纸雕 · 旅行海报', en: 'Rio diorama · Travel poster' },
    sourceLabel: '@john_my07',
    focus: { zh: '立体层次、地标、票据文字与纸张质感', en: 'Spatial layers, landmarks, ticket lettering and paper texture' },
    summary: {
      zh: '票据、基督像、黄车与纸质底座完整；街道立面更突出，周边注记更密集。',
      en: 'The ticket, statue, yellow taxi and miniature base are present. Street facades are more prominent and surrounding notes are denser.'
    }
  }),
  recreation(watercolorInput, watercolorRecord, watercolorImage, {
    title: { zh: '曼哈顿公园 · 水彩插画', en: 'Manhattan park · Watercolor' },
    sourceLabel: '@Taaruk_',
    focus: { zh: '水彩笔触、前后景层次、人物与无字约束', en: 'Watercolor texture, scene depth, people and the no-text constraint' },
    summary: {
      zh: '石桥与池塘占据更醒目的前景，树木覆盖更满；保留了无字的水彩与钢笔风格。',
      en: 'The bridge and pond occupy a more prominent foreground, with denser trees. The watercolor-and-ink style stays free of visible text.'
    }
  }),
  recreation(iconInput, iconRecord, iconImage, {
    title: { zh: 'Bichon Shop · 应用图标', en: 'Bichon Shop · App icon' },
    sourceLabel: '@iamaiistudio',
    focus: { zh: '圆角轮廓、留白、毛发材质与品牌文字', en: 'Rounded contour, padding, fur texture and brand lettering' },
    summary: {
      zh: '保留单个圆角图标与白底留白，卷毛与纸袋绳把更细；底色和品牌字体明显变化。',
      en: 'One rounded icon and white padding are retained, with detailed curls and rope handles. The background color and brand lettering change.'
    }
  })
];
