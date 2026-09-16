// 案例数据完整性校验：核对数量、唯一性、必填字段、图片关联与孤儿资源。
// 纯函数 validateCasesData 便于单测；CLI 从 data/ 读取并输出验收报告，异常时非零退出。
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const REQUIRED_FIELDS = ['id', 'title', 'image', 'prompt', 'category'];
const INDEX_REQUIRED_FIELDS = ['id', 'title', 'image', 'promptPreview', 'category', 'styles', 'scenes'];

function validateIndexPayload(payload) {
  const cases = Array.isArray(payload?.cases) ? payload.cases : [];
  const invalidCases = [];
  const ids = new Set();
  const duplicateIds = [];

  for (const item of cases) {
    if (ids.has(item.id)) duplicateIds.push(item.id);
    ids.add(item.id);
    const missingField = INDEX_REQUIRED_FIELDS.some(
      (field) => item[field] === undefined || item[field] === null || item[field] === ''
    );
    if (missingField) invalidCases.push(item.id);
  }

  const declaredTotal = Number(payload?.totalCases);
  const countMatches = Number.isFinite(declaredTotal) ? declaredTotal === cases.length : true;
  return {
    ok: countMatches && duplicateIds.length === 0 && invalidCases.length === 0,
    totalCases: cases.length,
    declaredTotal: Number.isFinite(declaredTotal) ? declaredTotal : cases.length,
    duplicateIds,
    invalidCases
  };
}

/**
 * 校验案例数据集。
 * @param {object} payload data/cases.json 内容
 * @param {Set<string>} imageNames data/images 下的文件名集合
 * @returns {{ok: boolean, totalCases: number, categories: number, styles: number, scenes: number,
 *   duplicateIds: number[], invalidCases: number[], missingImages: string[], orphanImages: string[]}}
 */
export function validateCasesData(payload, imageNames = new Set()) {
  const cases = Array.isArray(payload?.cases) ? payload.cases : [];
  const seen = new Set();
  const duplicateIds = [];
  const invalidCases = [];
  const missingImages = [];
  const referenced = new Set();

  for (const item of cases) {
    if (seen.has(item.id)) duplicateIds.push(item.id);
    seen.add(item.id);

    const missingField = REQUIRED_FIELDS.some(
      (field) => item[field] === undefined || item[field] === null || item[field] === ''
    );
    if (missingField) invalidCases.push(item.id);

    if (typeof item.image === 'string') {
      const name = item.image.split('/').pop();
      if (name) {
        referenced.add(name);
        if (imageNames.size > 0 && !imageNames.has(name)) missingImages.push(item.image);
      }
    }
  }

  // 孤儿图片：存在于 images 目录但无任何案例引用（排除非案例资源如 banner/favicon）。
  const orphanImages = [...imageNames].filter(
    (name) => /^case\d+\./i.test(name) && !referenced.has(name)
  );

  const declaredTotal = Number(payload?.totalCases);
  const countMatches = Number.isFinite(declaredTotal) ? declaredTotal === cases.length : true;

  // 孤儿图片（未被引用的历史资源）仅作警告，不致命；缺失图片会破坏站点，属致命。
  const ok =
    countMatches &&
    duplicateIds.length === 0 &&
    invalidCases.length === 0 &&
    missingImages.length === 0;

  return {
    ok,
    totalCases: cases.length,
    declaredTotal: Number.isFinite(declaredTotal) ? declaredTotal : cases.length,
    categories: Array.isArray(payload?.categories) ? payload.categories.length : 0,
    styles: Array.isArray(payload?.styles) ? payload.styles.length : 0,
    scenes: Array.isArray(payload?.scenes) ? payload.scenes.length : 0,
    duplicateIds,
    invalidCases,
    missingImages,
    orphanImages
  };
}

function main() {
  const root = dirname(dirname(fileURLToPath(import.meta.url)));
  const payload = JSON.parse(readFileSync(join(root, 'data', 'cases.json'), 'utf8'));
  let imageNames = new Set();
  try {
    imageNames = new Set(readdirSync(join(root, 'data', 'images')));
  } catch {
    imageNames = new Set();
  }

  const report = validateCasesData(payload, imageNames);
  console.log('案例数据校验报告:');
  console.log(`  案例数: ${report.totalCases}（声明 ${report.declaredTotal}）`);
  console.log(`  分类/风格/场景: ${report.categories}/${report.styles}/${report.scenes}`);
  console.log(`  重复 ID: ${report.duplicateIds.length}`);
  console.log(`  字段缺失案例: ${report.invalidCases.length}`);
  console.log(`  缺失图片: ${report.missingImages.length}`);
  console.log(`  孤儿图片: ${report.orphanImages.length}`);
  console.log(report.ok ? '结果: 通过 ✅' : '结果: 失败 ❌');

  let indexReport = null;
  try {
    const indexPayload = JSON.parse(readFileSync(join(root, 'data', 'cases-index.json'), 'utf8'));
    indexReport = validateIndexPayload(indexPayload);
    console.log('首屏索引校验报告:');
    console.log(`  案例数: ${indexReport.totalCases}（声明 ${indexReport.declaredTotal}）`);
    console.log(`  重复 ID: ${indexReport.duplicateIds.length}`);
    console.log(`  字段缺失案例: ${indexReport.invalidCases.length}`);
    console.log(indexReport.ok ? '结果: 通过 ✅' : '结果: 失败 ❌');
  } catch {
    // cases-index.json 可能不存在（例如只校验旧版本输出）；缺省跳过不阻断。
    indexReport = null;
  }

  if (!report.ok) {
    if (report.duplicateIds.length) console.error('  重复 ID:', report.duplicateIds.slice(0, 20));
    if (report.invalidCases.length) console.error('  字段缺失:', report.invalidCases.slice(0, 20));
    if (report.missingImages.length) console.error('  缺失图片:', report.missingImages.slice(0, 20));
    if (report.orphanImages.length) console.error('  孤儿图片:', report.orphanImages.slice(0, 20));
    process.exit(1);
  }

  if (indexReport && !indexReport.ok) {
    if (indexReport.duplicateIds.length) console.error('  索引重复 ID:', indexReport.duplicateIds.slice(0, 20));
    if (indexReport.invalidCases.length) console.error('  索引字段缺失:', indexReport.invalidCases.slice(0, 20));
    process.exit(1);
  }
}

// 仅在作为脚本直接运行时执行 CLI（被测试导入时不触发）。
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main();
}
