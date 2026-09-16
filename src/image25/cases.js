import mug from '../assets/image25-demo-mug.png';
import { realCases } from './realCases';

// Real recreations carry their own result image and generation record.
// The remaining illustrations are shared by both panels and labeled as UI demos.
export const comparisonCases = [
  ...realCases,
  {
    id: 'ceramic-mug',
    title: { zh: '陶瓷杯 · 商品摄影', en: 'Ceramic mug · Product photography' },
    prompt: '米色陶瓷杯，放在木桌上，柔和自然光，商业产品摄影。',
    image: mug,
    alt: { zh: '木桌上的米色斑点陶瓷杯，杯柄朝右，背景为虚化绿植', en: 'A beige speckled ceramic mug with its handle on the right, on a wooden table beside a blurred plant' },
    source: { zh: '专区原创示意素材', en: 'Illustration made for this page' },
    sourceUrl: '',
    focus: { zh: '材质、光线、构图与指令遵循', en: 'Material, light, composition, and prompt adherence' }
  },
  {
    "id": "gallery-531",
    "sourceCaseId": 531,
    "title": {
      "zh": "旅行海报 · 场景与文字",
      "en": "Travel poster · Scene & typography"
    },
    "prompt": "Create a luxurious, dreamy country travel-art collection in the exact visual language of an elegant premium tourism campaign: a large transparent crystal/glass architectural frame or arched glass display standing on a glossy reflective surface, containing a highly detailed cinematic illustration of the destination. For [COUNTRY], feature its most iconic landmarks, historic architecture, distinctive landscapes, local transportation, cultural elements, national flag, flowers and recognizable scenery arranged as one seamless poetic panorama. Use warm golden-hour sunlight, soft atmospheric haze, pastel cream, champagne, muted blue and sage tones, delicate clouds, subtle birds, realistic glass refraction and rainbow prism highlights along the edges. Create a perfect mirror reflection beneath the glass structure, extending the entire composition downward with beautifully softened reflections. Add elegant editorial typography at the top reading “[COUNTRY]”, with smaller refined text “THE SOUL OF [COUNTRY]” and “A JOURNEY THROUGH TIME • 2026” beneath it. Sophisticated luxury travel magazine aesthetic, photorealistic yet painterly, cinematic depth, fine-art composition, extremely detailed architecture, serene atmosphere, premium advertising photography, symmetrical balanced framing, soft film grain, 8K, vertical 4:5, no clutter, no modern UI elements, no extra text.",
    "image": "/images/case531.jpg",
    "alt": {
      "zh": "水晶框国家旅行广告海报",
      "en": "An illustrated Italy travel poster in a crystal frame"
    },
    "source": {
      "zh": "原案例 #531 · @Taaruk_（仅作示意）",
      "en": "Original case #531 · @Taaruk_ (illustration only)"
    },
    "sourceUrl": "https://x.com/Taaruk_/status/2091391283063361558",
    "focus": {
      "zh": "场景完整性、文字排版与建筑细节",
      "en": "Scene completeness, typography, and architecture"
    }
  },
  {
    "id": "gallery-526",
    "sourceCaseId": 526,
    "title": {
      "zh": "光影海报 · 构图与质感",
      "en": "Light poster · Composition & texture"
    },
    "prompt": "从全黑剧场开始，像切标本一样用六片真实体积激光把空间分层。光面必须有明确起点、透视和薄雾中的厚度，人物站在交汇点，透明道具折射出一小束异色光扇。构图沿左下至右上的对角线推进，脸只用一道克制边光揭示；标题与其中一片光面共享透视，小字留在纯黑负空间。每次替换主题与角色时，不得退化成夜店模板、HUD、霓虹城市或无物理来源的光线。",
    "image": "/images/case526.jpg",
    "alt": {
      "zh": "体积激光黑场海报",
      "en": "A person holding a transparent object between colored light beams"
    },
    "source": {
      "zh": "原案例 #526 · @zhidawang219555（仅作示意）",
      "en": "Original case #526 · @zhidawang219555 (illustration only)"
    },
    "sourceUrl": "https://x.com/zhidawang219555/status/2090246237094310178",
    "focus": {
      "zh": "光线逻辑、空间层次与文字布局",
      "en": "Light, spatial depth, and typography"
    }
  }
];

export const modelDocs = {
  sunburst: 'https://developers.openai.com/api/docs/models/gpt-image-2.5-sunburst',
  flare: 'https://developers.openai.com/api/docs/models/gpt-image-2.5-flare',
  guide: 'https://developers.openai.com/api/docs/guides/image-generation'
};
